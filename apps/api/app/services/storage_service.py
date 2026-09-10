import asyncio
import os
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger("storage_service")

class BaseStorageBackend(ABC):
    @abstractmethod
    async def save(self, org_id: str, path_suffix: str, content: bytes) -> str:
        """Saves file into tenant-isolated path. Returns relative storage key."""
        pass

    @abstractmethod
    async def read(self, org_id: str, relative_key: str) -> bytes:
        """Reads file from tenant-isolated path."""
        pass

    @abstractmethod
    async def exists(self, org_id: str, relative_key: str) -> bool:
        """Checks if file exists in tenant workspace."""
        pass

    @abstractmethod
    async def delete(self, org_id: str, relative_key: str) -> bool:
        """Deletes file from tenant workspace."""
        pass

class LocalTenantStorageBackend(BaseStorageBackend):
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or getattr(settings, "LOCAL_STORAGE_DIR", "./storage")
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_tenant_path(self, org_id: str, relative_key: str) -> str:
        # Strict tenant boundary check: prevent path traversal attacks
        if ".." in relative_key or ".." in str(org_id):
            raise PermissionError("Acceso denegado: Intento de evasión de aislamiento de tenant.")

        clean_org = str(org_id).replace("/", "").replace("\\", "")
        clean_rel = relative_key.lstrip("/\\")
        
        # If the key was returned as "org_id/path/file.xml", strip the matching org prefix
        if clean_rel.startswith(clean_org + "/") or clean_rel.startswith(clean_org + "\\"):
            clean_rel = clean_rel[len(clean_org) + 1:]
        elif "/" in clean_rel or "\\" in clean_rel:
            first_segment = clean_rel.split("/")[0].split("\\")[0]
            if len(first_segment) == 36 and "-" in first_segment and first_segment != clean_org:
                # Attempted access to another tenant's folder
                raise FileNotFoundError("Archivo no pertenece a este tenant.")

        tenant_root = os.path.realpath(os.path.join(self.base_dir, clean_org))
        full_path = os.path.realpath(os.path.join(tenant_root, clean_rel))
        if os.path.commonpath([tenant_root, full_path]) != tenant_root:
            raise PermissionError("Acceso denegado: Intento de evasión de aislamiento de tenant.")
        return full_path

    async def save(self, org_id: str, path_suffix: str, content: bytes) -> str:
        full_path = self._resolve_tenant_path(org_id, path_suffix)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        clean_org = str(org_id).replace("..", "").replace("/", "").replace("\\", "")
        clean_rel = path_suffix.lstrip("/\\").replace("..", "")
        return f"{clean_org}/{clean_rel}"

    async def read(self, org_id: str, relative_key: str) -> bytes:
        full_path = self._resolve_tenant_path(org_id, relative_key)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Archivo no encontrado en almacenamiento del tenant: {relative_key}")
        with open(full_path, "rb") as f:
            return f.read()

    async def exists(self, org_id: str, relative_key: str) -> bool:
        full_path = self._resolve_tenant_path(org_id, relative_key)
        return os.path.exists(full_path)

    async def delete(self, org_id: str, relative_key: str) -> bool:
        full_path = self._resolve_tenant_path(org_id, relative_key)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

class S3TenantStorageBackend(BaseStorageBackend):
    def __init__(
        self,
        bucket_name: str,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        region_name: str = "us-east-1",
        endpoint_url: Optional[str] = None,
        client: Optional[Any] = None,
    ):
        if not bucket_name:
            raise ValueError("S3_BUCKET_NAME es obligatorio para almacenamiento S3/R2.")
        self.bucket = bucket_name
        self.endpoint_url = endpoint_url
        self.region_name = region_name
        self.client = client if client is not None else boto3.client(
            "s3",
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=region_name,
            endpoint_url=endpoint_url,
            config=Config(
                signature_version="s3v4",
                connect_timeout=10,
                read_timeout=30,
                retries={"mode": "standard", "max_attempts": 3},
                s3={"addressing_style": "path"},
                request_checksum_calculation="when_required",
                response_checksum_validation="when_required",
            ),
        )

    def _build_key(self, org_id: str, path_suffix: str) -> str:
        clean_org = str(uuid.UUID(str(org_id)))
        prefix = f"tenants/{clean_org}/"
        if path_suffix.startswith("tenants/"):
            if not path_suffix.startswith(prefix):
                raise FileNotFoundError("Archivo no pertenece a este tenant.")
            path_suffix = path_suffix[len(prefix):]
        if (
            not path_suffix or path_suffix.startswith("/")
            or "\\" in path_suffix or "\x00" in path_suffix
            or any(part in {"", ".", ".."} for part in path_suffix.split("/"))
        ):
            raise PermissionError("Ruta de almacenamiento inválida.")
        return prefix + path_suffix

    @staticmethod
    def _is_missing(error: ClientError) -> bool:
        return str(error.response.get("Error", {}).get("Code")) in {"404", "NoSuchKey", "NotFound"}

    async def save(self, org_id: str, path_suffix: str, content: bytes) -> str:
        key = self._build_key(org_id, path_suffix)
        await asyncio.to_thread(self.client.put_object, Bucket=self.bucket, Key=key, Body=content)
        return key

    async def read(self, org_id: str, relative_key: str) -> bytes:
        key = self._build_key(org_id, relative_key)

        def read_object() -> bytes:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            body = response["Body"]
            try:
                return body.read()
            finally:
                body.close()

        try:
            return await asyncio.to_thread(read_object)
        except ClientError as error:
            if self._is_missing(error):
                raise FileNotFoundError("Objeto S3 no encontrado.") from error
            raise

    async def exists(self, org_id: str, relative_key: str) -> bool:
        key = self._build_key(org_id, relative_key)
        try:
            await asyncio.to_thread(self.client.head_object, Bucket=self.bucket, Key=key)
            return True
        except ClientError as error:
            if self._is_missing(error):
                return False
            raise

    async def delete(self, org_id: str, relative_key: str) -> bool:
        key = self._build_key(org_id, relative_key)
        if not await self.exists(org_id, key):
            return False
        await asyncio.to_thread(self.client.delete_object, Bucket=self.bucket, Key=key)
        return True

class StorageService:
    def __init__(self, backend: Optional[BaseStorageBackend] = None):
        if backend:
            self.backend = backend
        else:
            storage_type = settings.STORAGE_TYPE
            if storage_type == "S3":
                self.backend = S3TenantStorageBackend(
                    bucket_name=settings.S3_BUCKET_NAME,
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    endpoint_url=settings.S3_ENDPOINT_URL,
                )
            else:
                self.backend = LocalTenantStorageBackend()

    async def save_fiscal_xml(
        self,
        organization_id: uuid.UUID,
        numeric_key: str,
        signed_xml: str,
        hacienda_response_xml: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Stores signed XML and response XML under strict tenant isolation.
        Protected against unauthenticated public access.
        """
        org_str = str(organization_id)
        xml_path = f"invoices/xml/{numeric_key}_signed.xml"
        signed_key = await self.backend.save(org_str, xml_path, signed_xml.encode("utf-8"))

        resp_key = None
        if hacienda_response_xml:
            resp_path = f"invoices/xml/{numeric_key}_response.xml"
            resp_key = await self.backend.save(org_str, resp_path, hacienda_response_xml.encode("utf-8"))

        return {
            "signed_xml_key": signed_key,
            "response_xml_key": resp_key
        }

    async def read_fiscal_xml(self, organization_id: uuid.UUID, relative_key: str) -> str:
        content_bytes = await self.backend.read(str(organization_id), relative_key)
        return content_bytes.decode("utf-8")

    async def delete_fiscal_document(self, organization_id: uuid.UUID, relative_key: str) -> bool:
        return await self.backend.delete(str(organization_id), relative_key)
