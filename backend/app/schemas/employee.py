from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Roles disponibles (permisos)
AVAILABLE_ROLES = ["admin", "employee"]


class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    role: str = "employee"
    profession: Optional[str] = Field(None, max_length=100) 
    password: Optional[str] = Field(None, min_length=6)

class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    role: Optional[str] = None
    profession: Optional[str] = Field(None, max_length=100)  # Texto libre
    is_active: Optional[bool] = None

class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    profession: Optional[str] = None
    is_active: bool
    created_at: datetime
    temporary_password: Optional[str] = None
    
    class Config:
        from_attributes = True

class AvailableRolesResponse(BaseModel):
    roles: list[str]
  

class ResetPasswordResponse(BaseModel):
    message: str
    temporary_password: str
