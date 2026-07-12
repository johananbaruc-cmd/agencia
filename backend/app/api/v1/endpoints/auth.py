from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.schemas.auth import (
    AgencyRegister, AgencyRegisterResponse,
    UserLogin, TokenResponse,
    ClientMagicLinkRequest, MagicLinkResponse,
    InviteUserRequest, InviteAcceptRequest,
    UserResponse
)
from app.services.auth_service import AuthService
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/register", response_model=AgencyRegisterResponse, status_code=status.HTTP_201_CREATED)
def register_agency(
    data: AgencyRegister,
    db: Session = Depends(get_db)
):
    """
    Registra una nueva agencia con su primer administrador.
    Esto es público y no requiere autenticación.
    """
    agency_data = {
        "agency_name": data.agency_name,
        "agency_email": data.agency_email,
        "agency_rfc": data.agency_rfc
    }
    admin_data = {
        "admin_name": data.admin_name,
        "admin_email": data.admin_email,
        "admin_password": data.admin_password
    }
    
    result = AuthService.register_agency(db, agency_data, admin_data)
    return result

@router.post("/login", response_model=TokenResponse)
def login(
    data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login para administradores y empleados.
    Retorna token JWT para autenticación.
    """
    result = AuthService.login_user(db, data.email, data.password)
    return result

@router.post("/magic-link", response_model=MagicLinkResponse)
def request_magic_link(
    data: ClientMagicLinkRequest,
    agency_id: int = None,  # Opcional para cuando se sepa la agencia
    db: Session = Depends(get_db)
):
    """
    Genera un enlace mágico para que el cliente acceda sin contraseña.
    """
    result = AuthService.create_magic_link(db, data.email, agency_id)
    return result

@router.post("/invite", response_model=dict)
def invite_user(
    data: InviteUserRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Invita a un nuevo usuario (admin o employee) a la agencia.
    Solo administradores pueden invitar.
    """
    result = AuthService.invite_user(
        db, current_user, data.email, data.name, data.role
    )
    return result

@router.post("/accept-invite", response_model=dict)
def accept_invite(
    data: InviteAcceptRequest,
    db: Session = Depends(get_db)
):
    """
    Acepta una invitación y crea el usuario con la contraseña proporcionada.
    """
    result = AuthService.accept_invite(db, data.token, data.password)
    return result

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la información del usuario autenticado.
    """
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.core.security import verify_password, get_password_hash
    
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    current_user.hashed_password = get_password_hash(data.new_password)
    current_user.must_change_password = False
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}

@router.post("/logout")
def logout():
    """
    Logout - El cliente debe eliminar el token localmente.
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Sesión cerrada exitosamente"}
    )