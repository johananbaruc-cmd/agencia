# app/schemas/task.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "pending"
    project_id: int
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskStatusUpdate(BaseModel):
    status: str  # pending, in_progress, completed

class TaskResponse(TaskBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== SCHEMAS PARA EVIDENCIA ====================

class TaskEvidenceBase(BaseModel):
    task_id: int
    file_name: str
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    comment: Optional[str] = None
    delivery_date: Optional[datetime] = None  # ✅ AGREGAR

class TaskEvidenceCreate(TaskEvidenceBase):
    uploaded_by: int
    status: Optional[str] = "pending"

class TaskEvidenceResponse(TaskEvidenceBase):
    id: int
    uploaded_by: int
    uploaded_by_name: Optional[str] = None
    status: str = "pending"
    review_comment: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== SCHEMAS PARA APROBACIÓN ====================

class EvidenceApproveResponse(BaseModel):
    id: int
    status: str
    message: str


class EvidenceRejectResponse(BaseModel):
    id: int
    status: str
    review_comment: str
    message: str


# ==================== SCHEMAS PARA ACTUALIZAR FECHA DE ENTREGA ====================

class DeliveryDateUpdate(BaseModel):
    delivery_date: str  # Formato: YYYY-MM-DD


class DeliveryDateResponse(BaseModel):
    id: int
    delivery_date: datetime
    message: str