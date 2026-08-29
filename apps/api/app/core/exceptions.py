from typing import Any, Dict, Optional
from fastapi import HTTPException, status

class AppException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, details: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None):
        super().__init__(status_code=status_code, detail={"code": code, "message": message, "details": details or {}}, headers=headers)
        self.code = code
        self.message = message
        self.details = details or {}

class UnauthorizedException(AppException):
    def __init__(self, message: str = "No autorizado", code: str = "UNAUTHORIZED", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, code=code, message=message, details=details, headers={"WWW-Authenticate": "Bearer"})

class ForbiddenException(AppException):
    def __init__(self, message: str = "Permisos insuficientes", code: str = "FORBIDDEN", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, code=code, message=message, details=details)

class NotFoundException(AppException):
    def __init__(self, message: str = "Recurso no encontrado", code: str = "NOT_FOUND", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, code=code, message=message, details=details)

class BadRequestException(AppException):
    def __init__(self, message: str = "Petición inválida", code: str = "BAD_REQUEST", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, code=code, message=message, details=details)

class ConflictException(AppException):
    def __init__(self, message: str = "El recurso ya existe o hay conflicto", code: str = "CONFLICT", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_409_CONFLICT, code=code, message=message, details=details)

class AccountLockedException(AppException):
    def __init__(self, message: str = "Cuenta bloqueada temporalmente", code: str = "ACCOUNT_LOCKED", details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_423_LOCKED, code=code, message=message, details=details)
