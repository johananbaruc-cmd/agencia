from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Esquemas para crear proyectos
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    budget: float = Field(..., ge=0)
    client_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# Esquemas para actualizar proyectos - status es STRING libre
class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None  # ← String libre para columnas personalizadas
    progress: Optional[int] = Field(None, ge=0, le=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# Esquema de respuesta - status es STRING
class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    budget: float
    status: str  # ← String libre
    progress: int
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    agency_id: int
    client_id: int
    client_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# Esquema detallado para el modal
class ProjectDetailResponse(ProjectResponse):
    members: List[dict] = []
    tasks_count: int = 0
    deliverables_count: int = 0
    hours_spent: float = 0

# Asignar miembros a proyectos
class AssignMember(BaseModel):
    user_id: int

# Respuesta de miembros
class ProjectMemberResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    joined_at: datetime
    
    class Config:
        from_attributes = True
