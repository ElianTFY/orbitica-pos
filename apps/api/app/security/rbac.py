from typing import List, Set
from app.core.constants import UserRole, ROLE_PERMISSIONS

def get_role_permissions(role: str) -> Set[str]:
    try:
        user_role = UserRole(role)
        return set(ROLE_PERMISSIONS.get(user_role, []))
    except ValueError:
        return set()

def has_permission(user_role: str, required_permission: str) -> bool:
    permissions = get_role_permissions(user_role)
    if "*" in permissions:
        return True
    return required_permission in permissions

def has_all_permissions(user_role: str, required_permissions: List[str]) -> bool:
    permissions = get_role_permissions(user_role)
    if "*" in permissions:
        return True
    return all(req in permissions for req in required_permissions)
