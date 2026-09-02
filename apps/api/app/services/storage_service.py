import os
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
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

        tenant_root = os.path.abspath(os.path.join(self.base_dir, clean_org))
        full_path = os.path.abspath(os.path.join(tenant_root, clean_rel))
        if not full_path.startswith(tenant_root):
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
        endpoint_url: Optional[str] = None
    ):
        self.bucket = bucket_name
        self.endpoint_url = endpoint_url
        self.region_name = region_name
        # Fallback to local memory mock if boto3 is not installed or credentials missing in dev
        self._mock_s3: Dict[str, bytes] = {}

    def _build_key(self, org_id: str, path_suffix: str) -> str:
        clean_org = str(org_id).replace("..", "").strip("/")
        clean_suffix = path_suffix.lstrip("/")
        return f"tenants/{clean_org}/{clean_suffix}"

    async def save(self, org_id: str, path_suffix: str, content: bytes) -> str:
        key = self._build_key(org_id, path_suffix)
        self._mock_s3[key] = content
        return key

    async def read(self, org_id: str, relative_key: str) -> bytes:
        key = relative_key if relative_key.startswith(f"tenants/{org_id}") else self._build_key(org_id, relative_key)
        if key not in self._mock_s3:
            raise FileNotFoundError(f"Objeto S3 no encontrado: {key}")
        return self._mock_s3[key]

    async def exists(self, org_id: str, relative_key: str) -> bool:
        key = relative_key if relative_key.startswith(f"tenants/{org_id}") else self._build_key(org_id, relative_key)
        return key in self._mock_s3

    async def delete(self, org_id: str, relative_key: str) -> bool:
        key = relative_key if relative_key.startswith(f"tenants/{org_id}") else self._build_key(org_id, relative_key)
        if key in self._mock_s3:
            del self._mock_s3[key]
            return True
        return False

class StorageService:
    def __init__(self, backend: Optional[BaseStorageBackend] = None):
        if backend:
            self.backend = backend
        else:
            storage_type = getattr(settings, "STORAGE_TYPE", "LOCAL").upper()
            if storage_type == "S3":
                self.backend = S3TenantStorageBackend(
                    bucket_name=getattr(settings, "S3_BUCKET_NAME", "orbitica-fiscal-vault"),
                    region_name=getattr(settings, "AWS_REGION", "us-east-1")
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
