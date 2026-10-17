"""Configuración leída de las variables de entorno.

Se lee en cada uso (no al importar) para que las pruebas puedan cambiar los valores y para
que `load_env()` ya haya cargado `backend/.env` cuando se consultan.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]

#: Tamaño máximo por defecto de un PDF al importarlo. Solo se guarda el texto (el PDF no se
#: conserva), así que un archivo grande no engorda la base de datos; el límite protege la RAM del
#: servidor mientras se procesa. El frontend lo repite en `VITE_MAX_PDF_MB`.
DEFAULT_MAX_PDF_MB = 200


def load_env() -> None:
    """Carga `backend/.env` (sin pisar variables ya definidas en el entorno)."""
    load_dotenv(BACKEND_ROOT / ".env")


def _positive_int(name: str, fallback: int) -> int:
    try:
        value = int(os.environ.get(name, ""))
    except ValueError:
        return fallback
    return value if value > 0 else fallback


@dataclass(frozen=True)
class Limits:
    """Límites de la carga de PDF."""

    max_pdf_bytes: int
    max_cover_bytes: int
    max_pdf_pages: int
    concurrency: int
    job_ttl_seconds: int
    #: Cuánto se conserva una preparación (PDF ya leído, a la espera de los datos del formulario).
    stage_ttl_seconds: int
    #: MongoDB limita cada documento a 16 MB; el texto va embebido en el libro.
    max_content_bytes: int
    #: Procesos que leen PDF en paralelo.
    pdf_workers: int
    #: Desde cuántas páginas un PDF se reparte entre varios procesos.
    parallel_min_pages: int


def get_limits() -> Limits:
    return Limits(
        max_pdf_bytes=_positive_int("MAX_PDF_SIZE_MB", DEFAULT_MAX_PDF_MB) * 1024 * 1024,
        max_cover_bytes=512 * 1024,
        max_pdf_pages=_positive_int("MAX_PDF_PAGES", 2000),
        concurrency=_positive_int("UPLOAD_CONCURRENCY", 2),
        job_ttl_seconds=_positive_int("JOB_TTL_MINUTES", 60) * 60,
        stage_ttl_seconds=_positive_int("STAGE_TTL_MINUTES", 20) * 60,
        max_content_bytes=15 * 1024 * 1024,
        pdf_workers=_positive_int("PDF_WORKERS", max(1, min(6, (os.cpu_count() or 2) - 1))),
        parallel_min_pages=_positive_int("PDF_PARALLEL_MIN_PAGES", 120),
    )


def get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET no está definida en backend/.env")
    return secret


def get_uploads_dir() -> Path:
    """Carpeta raíz de los archivos subidos (por defecto `backend/uploads`)."""
    return (BACKEND_ROOT / os.environ.get("UPLOADS_DIR", "uploads")).resolve()


def get_covers_dir() -> Path:
    return get_uploads_dir() / "portadas"
