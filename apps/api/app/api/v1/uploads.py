import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.services.storage_service import StorageService
from app.security.deps import CurrentUserContext, require_organization_access
from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException

router = APIRouter(prefix="/uploads", tags=["File Storage & Uploads"])

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_CATEGORIES = {"products", "logos", "documents"}

def detect_image_mime(content: bytes) -> Optional[str]:
    """Detects real image MIME type using magic bytes to prevent spoofing."""
    if len(content) < 8:
        return None
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"RIFF") and b"WEBP" in content[8:16]:
        return "image/webp"
    if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
        return "image/gif"
    return None

MIME_TO_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}

@router.post("/image", response_model=StandardResponse[dict], status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    category: str = Form("products"),
    context: CurrentUserContext = Depends(require_organization_access),
    db: AsyncSession = Depends(get_db)
):
    if category not in ALLOWED_CATEGORIES:
        raise BadRequestException(f"Categoría '{category}' no permitida. Categorías válidas: {', '.join(ALLOWED_CATEGORIES)}")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise BadRequestException(f"El archivo excede el tamaño máximo permitido de 5 MB ({len(content)} bytes)")

    mime = detect_image_mime(content)
    if not mime:
        raise BadRequestException("Archivo inválido o corrupto. Solo se permiten imágenes válidas (PNG, JPEG, WEBP, GIF)")

    ext = MIME_TO_EXT[mime]
    safe_filename = f"{uuid.uuid4().hex}.{ext}"
    relative_path = f"uploads/{category}/{safe_filename}"

    storage = StorageService()
    saved_key = await storage.backend.save(str(context.organization_id), relative_path, content)

    public_url = f"/api/v1/uploads/{category}/{safe_filename}"

    return StandardResponse(
        data={
            "url": public_url,
            "filename": safe_filename,
            "category": category,
            "mime_type": mime,
            "size_bytes": len(content),
            "storage_key": saved_key
        },
        message="Imagen subida y resguardada exitosamente"
    )

@router.get("/{category}/{filename}")
async def get_uploaded_file(
    category: str,
    filename: str,
    context: CurrentUserContext = Depends(require_organization_access),
    db: AsyncSession = Depends(get_db)
):
    if category not in ALLOWED_CATEGORIES:
        raise NotFoundException("Categoría no encontrada")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise ForbiddenException("Ruta no válida")

    ext = filename.split(".")[-1].lower() if "." in filename else ""
    mime_map = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
    }
    media_type = mime_map.get(ext, "application/octet-stream")

    relative_path = f"uploads/{category}/{filename}"
    storage = StorageService()

    try:
        content = await storage.backend.read(str(context.organization_id), relative_path)
    except (FileNotFoundError, PermissionError):
        raise NotFoundException("Archivo no encontrado")

    return Response(content=content, media_type=media_type)

@router.delete("/{category}/{filename}", response_model=StandardResponse[dict])
async def delete_uploaded_file(
    category: str,
    filename: str,
    context: CurrentUserContext = Depends(require_organization_access),
    db: AsyncSession = Depends(get_db)
):
    if category not in ALLOWED_CATEGORIES:
        raise NotFoundException("Categoría no encontrada")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise ForbiddenException("Ruta no válida")

    relative_path = f"uploads/{category}/{filename}"
    storage = StorageService()

    deleted = await storage.backend.delete(str(context.organization_id), relative_path)
    if not deleted:
        raise NotFoundException("Archivo no encontrado o ya eliminado")

    return StandardResponse(
        data={"deleted": True, "filename": filename},
        message="Archivo eliminado exitosamente"
    )
