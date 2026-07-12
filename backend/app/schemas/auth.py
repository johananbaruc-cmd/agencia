from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Esquemas de registro
class AgencyRegister(BaseModel):
    """Datos para registrar una nueva agencia"""
    agency_name: str = Field(..., min_length=2, max_length=200)
    agency_email: EmailStr
    agency_rfc: Optional[str] = Field(None, min_length=12, max_length=13)
    
    admin_name: str = Field(..., min_length=2, max_length=200)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=6)

class AgencyRegisterResponse(BaseModel):
    """Respuesta después de registrar agencia"""
    agency_id: int
    agency_name: str
    admin_id: int
    admin_email: str
    message: str

# Esquemas de login
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ClientMagicLinkRequest(BaseModel):
    """Solicitud de magic link para cliente"""
    email: EmailStr

class TokenResponse(BaseModel):
    """Respuesta con tokens JWT"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    user_role: str
    agency_id: int
    must_change_password: bool = False  # ← Agregado

class MagicLinkResponse(BaseModel):
    """Respuesta para solicitud de magic link"""
    message: str
    magic_link: Optional[str] = None  # Solo en desarrollo

# Esquemas para invitación de usuarios
class InviteUserRequest(BaseModel):
    email: EmailStr
    name: str
    role: str  # "admin" o "employee"

class InviteAcceptRequest(BaseModel):
    token: str
    password: str

# Esquemas de usuario
class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True