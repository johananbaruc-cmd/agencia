from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

# ============================================
# ESQUEMA PARA CREAR PROYECTOS
# ============================================
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200, description="Nombre del proyecto")
    description: Optional[str] = Field(None, description="Descripción del proyecto")
    budget: float = Field(..., ge=0, description="Presupuesto del proyecto")
    client_id: int = Field(..., description="ID del cliente")
    start_date: Optional[datetime] = Field(None, description="Fecha de inicio")
    end_date: Optional[datetime] = Field(None, description="Fecha de fin")
    
    # Validación opcional: end_date debe ser mayor que start_date
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return v

# ============================================
# ESQUEMA PARA ACTUALIZAR PROYECTOS
# ============================================
class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200, description="Nombre del proyecto")
    description: Optional[str] = Field(None, description="Descripción del proyecto")
    budget: Optional[float] = Field(None, ge=0, description="Presupuesto del proyecto")
    status: Optional[str] = Field(None, description="Estado del proyecto")
    progress: Optional[int] = Field(None, ge=0, le=100, description="Progreso en porcentaje")
    start_date: Optional[datetime] = Field(None, description="Fecha de inicio")
    end_date: Optional[datetime] = Field(None, description="Fecha de fin")  # ✅ EDITABLE
    
    # Validación opcional: end_date debe ser mayor que start_date
    @validator('end_date')
    def validate_end_date(cls, v, values):
        # Validar solo si ambos campos están presentes
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return v

# ============================================
# ESQUEMA PARA RESPUESTA BÁSICA
# ============================================
class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    budget: float
    status: str
    progress: int
    start_date: Optional[datetime]
    end_date: Optional[datetime]  # ✅ INCLUIDO en respuesta
    created_at: datetime
    updated_at: Optional[datetime]
    agency_id: int
    client_id: int
    client_name: Optional[str] = None
    
    class Config:
        from_attributes = True  # SQLAlchemy → Pydantic

# ============================================
# ESQUEMA PARA RESPUESTA DETALLADA
# ============================================
class ProjectMemberResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    joined_at: datetime
    
    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    members: List[ProjectMemberResponse] = []
    tasks_count: int = 0
    deliverables_count: int = 0
    hours_spent: float = 0

# ============================================
# ESQUEMA PARA ASIGNAR MIEMBROS
# ============================================
class AssignMember(BaseModel):
    user_id: int = Field(..., description="ID del usuario a asignar")

# ============================================
# ESQUEMA PARA FILTRAR PROYECTOS (Opcional)
# ============================================
class ProjectFilter(BaseModel):
    status: Optional[str] = None
    client_id: Optional[int] = None
    start_date_from: Optional[datetime] = None
    start_date_to: Optional[datetime] = None
    end_date_from: Optional[datetime] = None
    end_date_to: Optional[datetime] = None
    min_budget: Optional[float] = Field(None, ge=0)
    max_budget: Optional[float] = Field(None, ge=0)