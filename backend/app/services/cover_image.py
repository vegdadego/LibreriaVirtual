"""Reconocimiento del formato real de una imagen de portada (por sus primeros bytes)."""

from __future__ import annotations

PNG_SIGNATURE = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])


def detect_image_mime(data: bytes | None) -> str | None:
    """`image/jpeg`, `image/png` o `image/webp` según el contenido; `None` si no es ninguno."""
    if not data or len(data) < 12:
        return None
    if data[0] == 0xFF and data[1] == 0xD8 and data[2] == 0xFF:
        return "image/jpeg"
    if data[:8] == PNG_SIGNATURE:
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None
