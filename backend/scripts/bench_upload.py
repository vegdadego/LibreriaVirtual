"""Compara la subida de un PDF grande completa (multipart) con la subida por fragmentos.

Arranca un `mongod` temporal y un `uvicorn` real (así se mide HTTP de verdad, no un cliente en
memoria), sube el mismo PDF de las dos maneras y de ahí hasta guardar el libro, e imprime los tiempos.
Si el sistema de pruebas no encuentra `mongod`, define `MONGOD_BIN`.

Uso (desde backend/):  python -m scripts.bench_upload [--mb 60] [--pages 400] [--chunk-kb 4096]

Todo ocurre en `localhost`, así que mide el costo del servidor (analizar multipart, copiar el
archivo) y no la ganancia de repetir fragmentos o subir varios a la vez en una red lenta.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx
import jwt
import pymupdf

from tests.conftest import _find_mongod

SECRET = "secreto-del-benchmark-con-longitud-suficiente"


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def make_big_pdf(megabytes: int, pages: int) -> bytes:
    """PDF de `pages` páginas de texto con un adjunto incompresible hasta pesar unos `megabytes` MB."""
    doc = pymupdf.open()
    for number in range(1, pages + 1):
        page = doc.new_page()
        text = f"Página {number}. " + "Había una vez un niño en la montaña. " * 30
        page.insert_textbox(pymupdf.Rect(50, 50, 550, 780), text, fontsize=11)
    doc.embfile_add("relleno.bin", os.urandom(megabytes * 1024 * 1024))
    return doc.tobytes()


def wait_http(url: str, timeout: float = 90) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if httpx.get(url, timeout=2).status_code < 500:
                return
        except httpx.HTTPError:
            time.sleep(0.3)
    raise RuntimeError("El servidor no arrancó")


async def finish_book(http: httpx.AsyncClient, headers: dict, stage_id: str, title: str) -> int:
    """Espera la lectura, guarda el libro y devuelve cuántos ms tardó el trabajo de guardado."""
    while (await http.get(f"/books/stage/{stage_id}", headers=headers)).json()["data"]["estado"] == "leyendo":
        await asyncio.sleep(0.05)
    sent = await http.post(
        "/books/upload", headers=headers, files=[("stage_id", (None, stage_id)), ("titulo", (None, title))]
    )
    job_id = sent.json()["data"]["jobId"]
    while True:
        data = (await http.get(f"/books/uploads/{job_id}", headers=headers)).json()["data"]
        if data["estado"] in ("completado", "error"):
            assert data["estado"] == "completado", data
            return data["duracion_ms"]
        await asyncio.sleep(0.05)


async def run(args, base: str, token: str, original: bytes) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    limits = httpx.Limits(max_connections=10)
    async with httpx.AsyncClient(base_url=base, timeout=600, limits=limits) as http:
        for round_number in range(1, args.rounds + 1):
            # Un comentario al final cambia el hash de cada ronda: el mismo PDF no se puede guardar dos veces.
            pdf = original + b"\n%ronda " + str(round_number).encode() + b"\n"
            started = time.perf_counter()
            response = await http.post("/books/stage", headers=headers, files={"pdf": ("grande.pdf", pdf, "application/pdf")})
            assert response.status_code == 201, response.text
            whole = time.perf_counter() - started
            stage_id = response.json()["data"]["stageId"]
            await http.delete(f"/books/stage/{stage_id}", headers=headers)

            started = time.perf_counter()
            opened = (await http.post("/books/stage/uploads", headers=headers, json={"nombre": "g.pdf", "tamano": len(pdf)})).json()["data"]
            size, upload_id = opened["tamano_fragmento"], opened["uploadId"]
            gate = asyncio.Semaphore(3)

            async def send(index: int) -> None:
                async with gate:
                    r = await http.put(
                        f"/books/stage/uploads/{upload_id}/{index}",
                        headers={**headers, "Content-Type": "application/octet-stream"},
                        content=pdf[index * size : (index + 1) * size],
                    )
                    assert r.status_code == 200, r.text

            await asyncio.gather(*(send(i) for i in range(opened["total_fragmentos"])))
            sent_at = time.perf_counter() - started
            done = await http.post(f"/books/stage/uploads/{upload_id}/complete", headers=headers)
            assert done.status_code == 201, done.text
            chunked = time.perf_counter() - started
            stage_id = done.json()["data"]["stageId"]
            save_ms = await finish_book(http, headers, stage_id, f"Libro de prueba {round_number}")
            print(
                f"ronda {round_number}: completo {whole:6.2f} s | por fragmentos {chunked:6.2f} s "
                f"({opened['total_fragmentos']} fragmentos, envío {sent_at:5.2f} s) | guardar libro {save_ms} ms"
            )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mb", type=int, default=60, help="peso aproximado del PDF")
    parser.add_argument("--pages", type=int, default=400)
    parser.add_argument("--chunk-kb", type=int, default=4096)
    parser.add_argument("--rounds", type=int, default=3)
    args = parser.parse_args()

    binary = _find_mongod()
    if not binary:
        print("No se encontró mongod: define MONGOD_BIN.")
        return 1
    print(f"Generando un PDF de ~{args.mb} MB...")
    pdf = make_big_pdf(args.mb, args.pages)
    print(f"PDF: {len(pdf) / 1024 / 1024:.1f} MB, {args.pages} páginas")

    work = tempfile.mkdtemp(prefix="libreria-bench-")
    mongo_port, api_port = free_port(), free_port()
    mongo = subprocess.Popen(
        [binary, "--dbpath", work, "--port", str(mongo_port), "--bind_ip", "127.0.0.1"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    env = {
        **os.environ,
        "JWT_SECRET": SECRET,
        "MONGO_URI": f"mongodb://127.0.0.1:{mongo_port}/bench",
        "MAX_PDF_SIZE_MB": str(args.mb + 20),
        "UPLOADS_DIR": str(Path(work) / "uploads"),
        "UPLOAD_CHUNK_KB": str(args.chunk_kb),
    }
    api = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(api_port), "--log-level", "warning"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        base = f"http://127.0.0.1:{api_port}/api/v1"
        wait_http(f"http://127.0.0.1:{api_port}/health")
        token = jwt.encode({"id": "a" * 24, "nombre_usuario": "bench", "tipo_usuario": "uploader"}, SECRET, algorithm="HS256")
        asyncio.run(run(args, base, token, pdf))
    finally:
        for process in (api, mongo):
            process.terminate()
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.kill()
        shutil.rmtree(work, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
