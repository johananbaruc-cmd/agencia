from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.models.client import Client

security = HTTPBearer()


# =============================================
# AUTENTICACIÓN BÁSICA
# =============================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Obtiene el usuario actual desde el token JWT"""
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
        )
    
    return user


def get_current_client_from_magic_link(
    token: str,
    db: Session = Depends(get_db)
) -> Client:
    """Obtiene el cliente desde el magic link token"""
    payload = verify_token(token, "magic_link")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Enlace mágico inválido o expirado"
        )
    
    email = payload.get("email")
    agency_id = payload.get("agency_id")
    
    client = db.query(Client).filter(
        Client.email == email,
        Client.agency_id == agency_id,
        Client.is_active == True
    ).first()
    
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cliente no encontrado"
        )
    
    return client


# =============================================
# VERIFICACIÓN DE ROLES
# =============================================

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario sea administrador"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return current_user


def require_employee_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario sea admin o empleado"""
    if current_user.role not in ["admin", "employee"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este recurso"
        )
    return current_user


def require_employee(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario sea empleado (excluye admin)"""
    if current_user.role != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este recurso es solo para empleados"
        )
    return current_user


def require_specific_role(allowed_roles: List[str]):
    """
    Fábrica de dependencias para verificar roles específicos.
    Uso: Depends(require_specific_role(['photographer', 'designer']))
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requieren uno de estos roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# =============================================
# ALIAS PARA COMPATIBILIDAD (NUEVOS ENDPOINTS)
# =============================================

def get_current_admin(current_user: User = Depends(require_admin)) -> User:
    """
    Alias de require_admin para compatibilidad con endpoints nuevos.
    Útil para mantener consistencia en los endpoints de reportes.
    """
    return current_user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Alias para obtener usuario activo"""
    return current_user


# =============================================
# DEPENDENCIAS PARA REPORTES PÚBLICOS
# =============================================

def get_client_ip(request) -> str:
    """Obtiene la IP del cliente desde el request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_user_agent(request) -> str:
    """Obtiene el User-Agent del cliente"""
    return request.headers.get("user-agent", "unknown")