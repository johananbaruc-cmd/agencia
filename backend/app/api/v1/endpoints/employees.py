from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.security import get_password_hash
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    AvailableRolesResponse, ResetPasswordResponse,
    AVAILABLE_ROLES
)

router = APIRouter(prefix="/employees", tags=["Empleados"])

@router.get("/roles", response_model=AvailableRolesResponse)
def get_available_roles():
    """Obtener lista de roles disponibles (profesión es texto libre)"""
    return {"roles": AVAILABLE_ROLES}

@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    import secrets
    import string
    
    # Verificar email único
    existing_user = db.query(User).filter(User.email == employee_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con este email"
        )
    
    # Validar rol (solo admin/employee)
    if employee_data.role not in AVAILABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Roles disponibles: {', '.join(AVAILABLE_ROLES)}"
        )
    
    # Generar contraseña temporal
    if not employee_data.password:
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    else:
        temp_password = employee_data.password
    
    # Crear empleado con must_change_password = True
    new_employee = User(
        name=employee_data.name,
        email=employee_data.email,
        role=employee_data.role,
        profession=employee_data.profession,
        hashed_password=get_password_hash(temp_password),
        agency_id=current_user.agency_id,
        is_active=True,
        must_change_password=True  # ← Agregado: obligar cambio de contraseña
    )
    
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    return {
        "id": new_employee.id,
        "name": new_employee.name,
        "email": new_employee.email,
        "role": new_employee.role,
        "profession": new_employee.profession,
        "is_active": new_employee.is_active,
        "created_at": new_employee.created_at,
        "temporary_password": temp_password
    }

@router.get("/")
def get_employees(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtener todos los empleados con sus proyectos asignados"""
    
    employees = db.query(User).filter(
        User.agency_id == current_user.agency_id
    ).all()
    
    # AGREGAR PROYECTOS A CADA EMPLEADO
    result = []
    for emp in employees:
        # Obtener proyectos del empleado
        projects = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == emp.id,
            Project.agency_id == current_user.agency_id
        ).all()
        
        result.append({
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "role": emp.role,
            "profession": emp.profession,
            "is_active": emp.is_active,
            "created_at": emp.created_at,
            "projects": [
                {
                    "id": p.id,
                    "name": p.name
                }
                for p in projects
            ]
        })
    
    return result

@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    employee = db.query(User).filter(
        User.id == employee_id,
        User.agency_id == current_user.agency_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    return employee

@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    employee = db.query(User).filter(
        User.id == employee_id,
        User.agency_id == current_user.agency_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    if employee_data.name is not None:
        employee.name = employee_data.name
    if employee_data.role is not None:
        if employee_data.role not in AVAILABLE_ROLES:
            raise HTTPException(status_code=400, detail="Rol inválido")
        employee.role = employee_data.role
    if employee_data.profession is not None:
        employee.profession = employee_data.profession
    if employee_data.is_active is not None:
        employee.is_active = employee_data.is_active
    
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    
    return employee

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    employee = db.query(User).filter(
        User.id == employee_id,
        User.agency_id == current_user.agency_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    if employee.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    db.delete(employee)
    db.commit()
    
    return None

@router.post("/{employee_id}/reset-password", response_model=ResetPasswordResponse)
def reset_employee_password(
    employee_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    import secrets
    import string
    
    employee = db.query(User).filter(
        User.id == employee_id,
        User.agency_id == current_user.agency_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    employee.hashed_password = get_password_hash(temp_password)
    db.commit()
    
    return {"message": "Contraseña restablecida", "temporary_password": temp_password}