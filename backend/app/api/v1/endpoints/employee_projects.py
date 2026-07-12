from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.services.project_service import ProjectService
from app.schemas.project import ProjectResponse

router = APIRouter(prefix="/employee", tags=["Empleado"])

@router.get("/projects", response_model=List[ProjectResponse])
def get_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener proyectos asignados al empleado actual
    """
    projects = ProjectService.get_projects_by_user(db, current_user)
    
    # Formatear respuesta
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
            "agency_id": project.agency_id,
            "client_id": project.client_id,
            "client_name": project.client.name if project.client else None,
        }
        result.append(project_data)
    
    return result


@router.get("/projects/{project_id}")
def get_my_project_detail(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener detalle de un proyecto específico donde el empleado es miembro.
    """
    project = ProjectService.get_project(db, project_id, current_user)
    
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
        "agency_id": project.agency_id,
        "client_id": project.client_id,
        "client_name": project.client.name if project.client else None,
        "members": ProjectService.get_project_members(db, project_id, current_user)
    }
    
    return project_data