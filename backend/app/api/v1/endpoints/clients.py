from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.client import Client

router = APIRouter(prefix="/clients", tags=["Clientes"])

class ClientCreate(BaseModel):
    name: str
    email: str
    phone: str = None
    company: str = None
    rfc: str = None

class ClientResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str = None
    company: str = None
    rfc: str = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ClientResponse])
def get_clients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clients = db.query(Client).filter(Client.agency_id == current_user.agency_id).all()
    return clients

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    client = Client(
        name=client_data.name,
        email=client_data.email,
        phone=client_data.phone,
        company=client_data.company,
        rfc=client_data.rfc,
        agency_id=current_user.agency_id,
        is_active=True
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Actualizar un cliente (solo administradores)
    """
    # Buscar el cliente
    client = db.query(Client).filter(Client.id == client_id).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    # Verificar que el cliente pertenece a la agencia
    if client.agency_id != current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para editar este cliente"
        )
    
    # Actualizar campos
    client.name = client_data.name
    client.email = client_data.email
    client.phone = client_data.phone
    client.company = client_data.company
    client.rfc = client_data.rfc
    client.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(client)
    
    return client

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Eliminar un cliente (solo administradores)
    """
    from app.models.project import Project
    
    client = db.query(Client).filter(Client.id == client_id).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    if client.agency_id != current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este cliente"
        )
    
    projects_count = db.query(Project).filter(Project.client_id == client_id).count()
    
    if projects_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el cliente porque tiene {projects_count} proyecto(s) asociado(s)"
        )
    
    db.delete(client)
    db.commit()
    
    return None
