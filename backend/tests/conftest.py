"""Fixtures de las pruebas: un `mongod` temporal, una base de datos limpia por módulo de pruebas y
un cliente HTTP que habla con la aplicación sin abrir puertos.

El binario de MongoDB se busca en `MONGOD_BIN`, en el `PATH` y en la carpeta de binarios que
descargó `mongodb-memory-server` (`%LOCALAPPDATA%/mongodb-binaries`). No se descarga nada.
"""

from __future__ import annotations

import glob
import os
import shutil
import socket
import subprocess
import tempfile
import time
from pathlib import Path

import httpx
import jwt
import pytest
import pytest_asyncio
from bson import ObjectId
from pymongo import MongoClient

# Antes de importar la aplicación: la configuración se lee del entorno.
os.environ["JWT_SECRET"] = "secreto-de-pruebas-con-longitud-suficiente"
os.environ["MAX_PDF_SIZE_MB"] = "1"
os.environ["PDF_WORKERS"] = "2"
os.environ["PDF_PARALLEL_MIN_PAGES"] = "120"
_UPLOADS = tempfile.mkdtemp(prefix="libreria-uploads-")
os.environ["UPLOADS_DIR"] = _UPLOADS
os.environ.pop("MONGO_URI", None)

from app import db as app_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services import pdf_text, staged_uploads, upload_jobs  # noqa: E402


def _find_mongod() -> str | None:
    candidates = [os.environ.get("MONGOD_BIN"), shutil.which("mongod")]
    local = os.environ.get("LOCALAPPDATA")
    if local:
        candidates += sorted(glob.glob(str(Path(local) / "mongodb-binaries" / "mongod-*")), reverse=True)
    candidates += sorted(glob.glob(str(Path.home() / ".cache" / "mongodb-binaries" / "mongod-*")), reverse=True)
    return next((c for c in candidates if c and Path(c).is_file() and not c.endswith(".md5")), None)


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="session")
def mongo_uri():
    binary = _find_mongod()
    if not binary:
        pytest.skip("No se encontró mongod: define MONGOD_BIN o instala MongoDB.")
    data_dir = tempfile.mkdtemp(prefix="libreria-mongo-")
    port = _free_port()
    process = subprocess.Popen(
        [binary, "--dbpath", data_dir, "--port", str(port), "--bind_ip", "127.0.0.1"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    uri = f"mongodb://127.0.0.1:{port}"
    deadline = time.time() + 60
    while True:
        try:
            with MongoClient(uri, serverSelectionTimeoutMS=500) as client:
                client.admin.command("ping")
            break
        except Exception:  # noqa: BLE001
            if time.time() > deadline or process.poll() is not None:
                process.kill()
                raise
            time.sleep(0.3)
    yield uri
    process.terminate()
    try:
        process.wait(timeout=20)
    except subprocess.TimeoutExpired:
        process.kill()
    shutil.rmtree(data_dir, ignore_errors=True)


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def database(request, mongo_uri):
    """Base de datos vacía y con índices para cada archivo de pruebas."""
    name = "test_" + request.module.__name__.rsplit(".", 1)[-1]
    await app_db.connect(f"{mongo_uri}/{name}")
    await app_db.get_db().client.drop_database(name)
    await app_db.ensure_indexes()
    upload_jobs.reset_jobs()
    staged_uploads.reset_stages()
    yield app_db.get_db()
    await app_db.disconnect()


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def client(database):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1", timeout=60) as http:
        yield http


@pytest.fixture(scope="session", autouse=True)
def _cleanup():
    yield
    pdf_text.shutdown_pool()
    shutil.rmtree(_UPLOADS, ignore_errors=True)


@pytest.fixture(scope="session")
def uploads_dir() -> Path:
    return Path(_UPLOADS)


def make_token(tipo_usuario: str, user_id: str | None = None) -> str:
    return jwt.encode(
        {"id": user_id or str(ObjectId()), "nombre_usuario": f"user-{tipo_usuario}", "tipo_usuario": tipo_usuario},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )


def auth(token: str | None) -> dict:
    return {"Authorization": f"Bearer {token}"} if token else {}
