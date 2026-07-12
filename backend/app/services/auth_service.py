from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from app.models.agency import Agency
from app.models.user import User
from app.models.client import Client
from app.core.security import (
    get_password_hash, verify_password, 
    create_access_token, create_magic_link_token
)
from app.core.config import settings

class AuthService:
    """Servicio para manejar autenticación y registro"""
    
    @staticmethod
    def register_agency(db: Session, agency_data: dict, admin_data: dict) -> dict:
        """Registra una nueva agencia con su primer admin"""
        
        existing_agency = db.query(Agency).filter(
            Agency.email == agency_data["agency_email"]
        ).first()
        if existing_agency:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una agencia con ese email"
            )
        
        existing_user = db.query(User).filter(
            User.email == admin_data["admin_email"]
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario con ese email"
            )
        
        agency = Agency(
            name=agency_data["agency_name"],
            email=agency_data["agency_email"],
            rfc=agency_data.get("agency_rfc"),
            is_active=True
        )
        db.add(agency)
        db.flush()
        
        # ⭐ ADMIN: must_change_password = False (no obligado)
        admin = User(
            email=admin_data["admin_email"],
            name=admin_data["admin_name"],
            role="admin",
            hashed_password=get_password_hash(admin_data["admin_password"]),
            agency_id=agency.id,
            is_active=True,
            must_change_password=False
        )
        db.add(admin)
        db.commit()
        db.refresh(agency)
        db.refresh(admin)
        
        return {
            "agency_id": agency.id,
            "agency_name": agency.name,
            "admin_id": admin.id,
            "admin_email": admin.email,
            "message": "Agencia registrada exitosamente"
        }
    
    @staticmethod
    def login_user(db: Session, email: str, password: str) -> dict:
        """Autentica un usuario y retorna token"""
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )
        
        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario inactivo"
            )
        
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "user_name": user.name,
            "user_role": user.role,
            "agency_id": user.agency_id,
            "must_change_password": getattr(user, 'must_change_password', False)
        }
    
    @staticmethod
    def create_magic_link(db: Session, email: str, agency_id: int = None) -> dict:
        """Crea un magic link para un cliente"""
        
        query = db.query(Client).filter(Client.email == email)
        if agency_id:
            query = query.filter(Client.agency_id == agency_id)
        
        client = query.first()
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente no encontrado"
            )
        
        token = create_magic_link_token(email, client.agency_id)
        
        client.magic_link_token = token
        client.magic_link_expires = datetime.utcnow() + timedelta(
            minutes=settings.MAGIC_LINK_EXPIRE_MINUTES
        )
        db.commit()
        
        magic_link = f"{settings.FRONTEND_URL}/auth/magic-login?token={token}"
        
        return {
            "message": "Enlace mágico generado",
            "magic_link": magic_link
        }
    
    @staticmethod
    def invite_user(db: Session, inviter: User, email: str, name: str, role: str) -> dict:
        """Invita a un nuevo usuario a la agencia"""
        
        if inviter.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden invitar usuarios"
            )
        
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        
        if role not in ["admin", "employee", "photographer", "mechanic", "manager", "developer", "designer", "editor", "coordinator"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rol inválido"
            )
        
        invite_token = create_access_token(
            data={
                "sub": email,
                "type": "invite",
                "agency_id": inviter.agency_id,
                "name": name,
                "role": role
            },
            expires_delta=timedelta(days=7)
        )
        
        invite_link = f"{settings.FRONTEND_URL}/auth/accept-invite?token={invite_token}"
        
        return {
            "message": "Invitación enviada",
            "invite_link": invite_link,
            "expires_in": "7 días"
        }
    
    @staticmethod
    def accept_invite(db: Session, token: str, password: str) -> dict:
        """Acepta una invitación y crea el usuario"""
        
        from app.core.security import verify_token
        
        payload = verify_token(token, "access")
        
        if not payload or payload.get("type") != "invite":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de invitación inválido o expirado"
            )
        
        email = payload.get("sub")
        agency_id = payload.get("agency_id")
        name = payload.get("name")
        role = payload.get("role")
        
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario ya existe"
            )
        
        # ⭐ EMPLEADO: must_change_password = True si es "employee"
        new_user = User(
            email=email,
            name=name,
            role=role,
            hashed_password=get_password_hash(password),
            agency_id=agency_id,
            is_active=True,
            must_change_password=True if role == "employee" else False
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "message": "Usuario registrado exitosamente",
            "user_id": new_user.id,
            "email": new_user.email
        }
