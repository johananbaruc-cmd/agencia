from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.models.client import Client
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectMemberResponse

class ProjectService:
    
    @staticmethod
    def create_project(db: Session, project_data: ProjectCreate, agency_id: int, created_by: int) -> Project:
        """Crear un nuevo proyecto (solo admin)"""
        
        client = db.query(Client).filter(
            Client.id == project_data.client_id,
            Client.agency_id == agency_id,
            Client.is_active == True
        ).first()
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente no encontrado o no pertenece a tu agencia"
            )
        
        project = Project(
            name=project_data.name,
            description=project_data.description,
            budget=project_data.budget,
            status="pending",
            progress=0,
            start_date=project_data.start_date,
            end_date=project_data.end_date,
            agency_id=agency_id,
            client_id=project_data.client_id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)
        
        return project
    
    @staticmethod
    def get_projects_by_user(db: Session, user: User) -> List[Project]:
        """Obtener proyectos según el rol del usuario"""
        
        if user.role == "admin":
            proyectos = db.query(Project).filter(Project.agency_id == user.agency_id).all()
        else:
            proyectos = db.query(Project).join(ProjectMember).filter(
                ProjectMember.user_id == user.id,
                Project.agency_id == user.agency_id
            ).all()
        
        # AUTOMÁTICAMENTE RECALCULAR PROGRESO DE CADA PROYECTO
        for proyecto in proyectos:
            ProjectService.recalcular_progreso(db, proyecto.id)
        
        # Volver a consultar los proyectos actualizados
        if user.role == "admin":
            proyectos = db.query(Project).filter(Project.agency_id == user.agency_id).all()
        else:
            proyectos = db.query(Project).join(ProjectMember).filter(
                ProjectMember.user_id == user.id,
                Project.agency_id == user.agency_id
            ).all()
        
        return proyectos
    
    @staticmethod
    def get_employee_projects(db: Session, employee_id: int, agency_id: int) -> List[Project]:
        """Obtener todos los proyectos de un empleado específico (para admin)"""
        
        proyectos = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == employee_id,
            Project.agency_id == agency_id
        ).all()
        
        # AUTOMÁTICAMENTE RECALCULAR PROGRESO DE CADA PROYECTO
        for proyecto in proyectos:
            ProjectService.recalcular_progreso(db, proyecto.id)
        
        # Volver a consultar los proyectos actualizados
        proyectos = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == employee_id,
            Project.agency_id == agency_id
        ).all()
        
        return proyectos
    
    @staticmethod
    def get_project(db: Session, project_id: int, user: User) -> Project:
        """Obtener un proyecto específico con verificación de permisos"""
        
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado"
            )
        
        if project.agency_id != user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a este proyecto"
            )
        
        if user.role == "employee":
            is_member = db.query(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id
            ).first()
            
            if not is_member:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes acceso a este proyecto"
                )
        
        # AUTOMÁTICAMENTE RECALCULAR PROGRESO
        ProjectService.recalcular_progreso(db, project_id)
        
        # Volver a consultar el proyecto actualizado
        project = db.query(Project).filter(Project.id == project_id).first()
        
        return project
    
    @staticmethod
    def update_project(db: Session, project_id: int, project_data: ProjectUpdate, user: User) -> Project:
        """Actualizar proyecto (solo admin)"""
        
        if user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden modificar proyectos"
            )
        
        project = ProjectService.get_project(db, project_id, user)
        
        for field, value in project_data.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        
        db.commit()
        db.refresh(project)
        
        return project
    
    @staticmethod
    def delete_project(db: Session, project_id: int, user: User) -> None:
        """Eliminar proyecto y todas sus dependencias (solo admin)"""
        
        if user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden eliminar proyectos"
            )
        
        from app.models.task import Task
        from app.models.time_entry import TimeEntry
        from app.models.project_member import ProjectMember
        
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado"
            )
        
        if project.agency_id != user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este proyecto"
            )
        
        # Eliminar en orden
        db.query(TimeEntry).filter(TimeEntry.project_id == project_id).delete()
        db.query(Task).filter(Task.project_id == project_id).delete()
        db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
        db.delete(project)
        db.commit()
    
    @staticmethod
    def assign_member(db: Session, project_id: int, user_id: int, admin: User) -> dict:
        """Asignar un empleado a un proyecto (solo admin)"""
        
        if admin.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden asignar miembros"
            )
        
        project = ProjectService.get_project(db, project_id, admin)
        
        user = db.query(User).filter(
            User.id == user_id,
            User.agency_id == admin.agency_id,
            User.role == "employee",
            User.is_active == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empleado no encontrado"
            )
        
        existing = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El empleado ya está asignado a este proyecto"
            )
        
        member = ProjectMember(project_id=project_id, user_id=user_id)
        db.add(member)
        db.commit()
        db.refresh(member)
        
        # Retornar en el formato esperado por el schema
        return {
            "id": member.id,
            "project_id": member.project_id,
            "user_id": user.id,
            "user_name": user.name,
            "user_email": user.email,
            "role": user.role,
            "joined_at": member.joined_at
        }
    
    @staticmethod
    def remove_member(db: Session, project_id: int, user_id: int, admin: User) -> None:
        """Remover un empleado de un proyecto (solo admin)"""
        
        if admin.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden remover miembros"
            )
        
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El empleado no está asignado a este proyecto"
            )
        
        db.delete(member)
        db.commit()
    
    @staticmethod
    def get_project_members(db: Session, project_id: int, user: User) -> List[dict]:
        """Obtener miembros de un proyecto"""
        
        project = ProjectService.get_project(db, project_id, user)
        
        # Consulta optimizada
        members = db.query(
            User.id,
            User.name,
            User.email,
            User.role,
            ProjectMember.joined_at
        ).join(ProjectMember).filter(
            ProjectMember.project_id == project_id
        ).all()
        
        # Retornar en el formato esperado
        return [
            {
                "id": member.id,
                "project_id": project_id,
                "user_id": member.id,
                "user_name": member.name,
                "user_email": member.email,
                "role": member.role,
                "joined_at": member.joined_at
            }
            for member in members
        ]

    # ==========================================
    # NUEVO: RECALCULAR PROGRESO AUTOMÁTICAMENTE
    # ==========================================
    @staticmethod
    def recalcular_progreso(db: Session, project_id: int) -> None:
        """Recalcula el progreso automáticamente según tareas completadas y evidencias aprobadas"""
        from app.models.task import Task
        from app.models.task_evidence import TaskEvidence
        
        # 1. Contar tareas del proyecto
        tareas = db.query(Task).filter(Task.project_id == project_id).all()
        total_tareas = len(tareas)
        completadas = sum(1 for t in tareas if t.status == "completed")
        
        # 2. Contar evidencias aprobadas
        evidencias = (
            db.query(TaskEvidence)
            .join(Task, Task.id == TaskEvidence.task_id)
            .filter(Task.project_id == project_id)
            .all()
        )
        aprobadas = sum(1 for e in evidencias if e.status.lower() == "approved")
        total_evidencias = len(evidencias)
        
        # 3. Calcular progreso (70% tareas + 30% evidencias)
        if total_tareas > 0:
            progreso_tareas = (completadas / total_tareas) * 70
        else:
            progreso_tareas = 0
        
        if total_evidencias > 0:
            progreso_evidencias = (aprobadas / total_evidencias) * 30
        else:
            progreso_evidencias = 0
        
        progreso_calculado = round(progreso_tareas + progreso_evidencias)
        
        # 4. Actualizar proyecto en la BD
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.progress = progreso_calculado
            db.commit()