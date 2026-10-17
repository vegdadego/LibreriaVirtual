"""Errores de la API y su respuesta uniforme `{success: false, code, message}`."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .serialize import ApiResponse

log = logging.getLogger("app")


class AppError(Exception):
    """Error previsto: lleva el estado HTTP, un código estable y un mensaje para el usuario."""

    def __init__(self, status: int, code: str, message: str, **extra):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.extra = extra


class LegacyError(Exception):
    """Error de las rutas heredadas (`/auth`, `/users`, `/sagas`, `/authors`): solo `{success, message}`."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error(_: Request, exc: AppError):
        return ApiResponse(
            {"success": False, "code": exc.code, "message": exc.message, **exc.extra},
            status_code=exc.status,
        )

    @app.exception_handler(LegacyError)
    async def legacy_error(_: Request, exc: LegacyError):
        return ApiResponse({"success": False, "message": exc.message}, status_code=exc.status)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            return ApiResponse(
                {"success": False, "message": f"Ruta no encontrada: {request.method} {request.url.path}"},
                status_code=404,
            )
        if exc.status_code == 405:
            return ApiResponse(
                {"success": False, "message": f"Ruta no encontrada: {request.method} {request.url.path}"},
                status_code=404,
            )
        return ApiResponse({"success": False, "code": "HTTP_ERROR", "message": str(exc.detail)}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        return ApiResponse(
            {"success": False, "code": "VALIDATION_ERROR", "message": "Solicitud inválida."}, status_code=400
        )

    @app.exception_handler(Exception)
    async def unexpected(_: Request, exc: Exception):
        log.exception("Error no controlado", exc_info=exc)
        return ApiResponse(
            {"success": False, "code": "INTERNAL_ERROR", "message": "Error interno del servidor."},
            status_code=500,
        )
