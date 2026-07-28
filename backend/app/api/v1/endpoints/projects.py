from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.task import Task
from app.models.time_entry import TimeEntry
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, 
    ProjectDetailResponse, ProjectMemberResponse, AssignMember
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Proyectos"])

# ============================================
# CREAR PROYECTO
# ============================================
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    project = ProjectService.create_project(
        db, project_data, current_user.agency_id, current_user.id
    )
    return project

# ============================================
# LISTAR PROYECTOS
# ============================================
@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    projects = ProjectService.get_projects_by_user(db, current_user)
    
    result = []
    for project in projects:
        project_data = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "budget": project.budget,
            "status": project.status,
            "progress": project.progress,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "agency_id": project.agency_id,
            "client_id": project.client_id,
            "client_name": project.client.name if project.client else None,
        }
        result.append(project_data)
    
    return result

# ============================================
# OBTENER PROYECTO POR ID
# ============================================
@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = ProjectService.get_project(db, project_id, current_user)
    members = ProjectService.get_project_members(db, project_id, current_user)
    
    tasks_count = db.query(Task).filter(Task.project_id == project_id).count()
    
    deliverables_count = 0
    try:
        from app.models.deliverable import Deliverable
        deliverables_count = db.query(Deliverable).filter(Deliverable.project_id == project_id).count()
    except ImportError:
        pass
    
    hours_spent = db.query(
        func.coalesce(func.sum(TimeEntry.hours), 0)
    ).filter(TimeEntry.project_id == project_id).scalar()
    
    return ProjectDetailResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        budget=project.budget,
        status=project.status,
        progress=project.progress,
        start_date=project.start_date,
        end_date=project.end_date,
        created_at=project.created_at,
        updated_at=project.updated_at,
        agency_id=project.agency_id,
        client_id=project.client_id,
        client_name=project.client.name if project.client else None,
        members=members,
        tasks_count=tasks_count,
        deliverables_count=deliverables_count,
        hours_spent=hours_spent
    )

# ============================================
# ACTUALIZAR PROYECTO - ACEPTA PUT Y PATCH
# ============================================
@router.put("/{project_id}", response_model=ProjectResponse)
@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Actualiza un proyecto.
    - PUT: Reemplaza todo el recurso
    - PATCH: Actualiza parcialmente
    - Ambos métodos son aceptados
    - Todos los campos son opcionales
    - end_date es completamente editable
    - start_date es completamente editable
    """
    project = ProjectService.update_project(db, project_id, project_data, current_user)
    return project

# ============================================
# ELIMINAR PROYECTO
# ============================================
@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ProjectService.delete_project(db, project_id, current_user)
    return None

# ============================================
# ASIGNAR MIEMBRO
# ============================================
@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
def assign_member(
    project_id: int,
    data: AssignMember,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    member = ProjectService.assign_member(db, project_id, data.user_id, current_user)
    return member

# ============================================
# ELIMINAR MIEMBRO
# ============================================
@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ProjectService.remove_member(db, project_id, user_id, current_user)
    return None

# ============================================
# LISTAR MIEMBROS
# ============================================
@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
def get_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    members = ProjectService.get_project_members(db, project_id, current_user)
    return members