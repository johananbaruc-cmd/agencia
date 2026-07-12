from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import shutil
import mimetypes
import json
import uuid
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.task import Task
from app.models.task_evidence import TaskEvidence
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskStatusUpdate, TaskEvidenceResponse, DeliveryDateUpdate

router = APIRouter(prefix="/tasks", tags=["Tareas"])

# Directorios para subida por partes
BASE_UPLOAD_DIR = "uploads/tasks"
CHUNK_DIR = "uploads/chunks"
CHUNK_SIZE = 5 * 1024 * 1024  # 5MB por chunk

# ==================== ENDPOINTS PARA ADMIN ====================

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Crear una nueva tarea (solo admin)"""
    
    # Verificar que el proyecto existe
    project = db.query(Project).filter(
        Project.id == task_data.project_id,
        Project.agency_id == current_user.agency_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado"
        )
    
    # Verificar que el empleado existe y es válido
    if task_data.assigned_to:
        employee = db.query(User).filter(
            User.id == task_data.assigned_to,
            User.agency_id == current_user.agency_id,
            User.role == "employee",
            User.is_active == True
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empleado no encontrado"
            )
        
        # Verificar que el empleado está asignado al proyecto
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == task_data.project_id,
            ProjectMember.user_id == task_data.assigned_to
        ).first()
        
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El empleado no está asignado a este proyecto"
            )
    
    task = Task(
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority or "medium",
        status="pending",
        project_id=task_data.project_id,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
        due_date=task_data.due_date
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/projects/{project_id}/tasks", response_model=List[TaskResponse])
def get_project_tasks(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener todas las tareas de un proyecto"""
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.agency_id == current_user.agency_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado"
        )
    
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Actualizar tarea (solo admin)"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    for key, value in task_data.dict(exclude_unset=True).items():
        setattr(task, key, value)
    
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Eliminar tarea (solo admin)"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    db.delete(task)
    db.commit()


# ==================== ENDPOINTS PARA EMPLEADOS ====================

@router.get("/my-tasks", response_model=List[TaskResponse])
def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener tareas asignadas al empleado actual"""
    
    if current_user.role == "admin":
        tasks = db.query(Task).filter(
            Task.created_by == current_user.id
        ).all()
    else:
        tasks = db.query(Task).filter(
            Task.assigned_to == current_user.id
        ).all()
    
    return tasks


@router.put("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar estado de tarea (empleado o admin)"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    # Verificar permisos
    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar esta tarea"
        )
    
    task.status = status_data.status
    db.commit()
    db.refresh(task)
    return task


# ==================== ENDPOINTS PARA CHUNKED UPLOAD ====================

@router.post("/{task_id}/evidence/chunk/start")
def start_chunk_upload(
    task_id: int,
    file_name: str,
    file_size: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Iniciar subida por partes (chunks)
    """
    # Verificar permisos
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir evidencia a esta tarea"
        )
    
    # Crear ID único para esta sesión de subida
    upload_id = str(uuid.uuid4())
    
    # Crear directorio temporal para los chunks
    temp_dir = f"{CHUNK_DIR}/{upload_id}"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Calcular número total de chunks
    total_chunks = (file_size + CHUNK_SIZE - 1) // CHUNK_SIZE
    
    # Guardar metadatos
    metadata = {
        "task_id": task_id,
        "file_name": file_name,
        "file_size": file_size,
        "upload_id": upload_id,
        "total_chunks": total_chunks,
        "created_at": datetime.now().isoformat()
    }
    
    with open(f"{temp_dir}/metadata.json", "w") as f:
        json.dump(metadata, f)
    
    return {
        "upload_id": upload_id,
        "chunk_size": CHUNK_SIZE,
        "total_chunks": total_chunks
    }


@router.post("/{task_id}/evidence/chunk")
async def upload_chunk(
    task_id: int,
    file: UploadFile = File(...),
    chunk_number: int = Form(...),
    upload_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Subir un chunk (parte) del archivo
    """
    # Verificar permisos
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir evidencia a esta tarea"
        )
    
    # Verificar que existe el directorio temporal
    temp_dir = f"{CHUNK_DIR}/{upload_id}"
    if not os.path.exists(temp_dir):
        raise HTTPException(status_code=404, detail="Sesión de subida no encontrada")
    
    # Guardar el chunk
    chunk_path = f"{temp_dir}/chunk_{chunk_number}"
    with open(chunk_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    return {
        "status": "chunk_received",
        "chunk": chunk_number
    }


@router.post("/{task_id}/evidence/chunk/complete")
async def complete_chunk_upload(
    task_id: int,
    upload_id: str = Form(...),
    comment: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Completar la subida, ensamblar todos los chunks
    """
    # Verificar permisos
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir evidencia a esta tarea"
        )
    
    # Verificar que existe el directorio temporal
    temp_dir = f"{CHUNK_DIR}/{upload_id}"
    if not os.path.exists(temp_dir):
        raise HTTPException(status_code=404, detail="Sesión de subida no encontrada")
    
    # Leer metadatos
    with open(f"{temp_dir}/metadata.json", "r") as f:
        metadata = json.load(f)
    
    # Obtener todos los chunks
    chunks = sorted(
        [f for f in os.listdir(temp_dir) if f.startswith("chunk_")],
        key=lambda x: int(x.split("_")[1])
    )
    
    # Verificar que todos los chunks estén presentes
    total_chunks = metadata["total_chunks"]
    if len(chunks) != total_chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Faltan chunks: {len(chunks)} de {total_chunks}"
        )
    
    # Crear directorio final
    final_dir = f"{BASE_UPLOAD_DIR}/{task_id}"
    os.makedirs(final_dir, exist_ok=True)
    
    # Nombre seguro del archivo final
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_filename = f"{timestamp}_{metadata['file_name']}"
    final_path = f"{final_dir}/{safe_filename}"
    
    # Ensamblar todos los chunks
    with open(final_path, "wb") as outfile:
        for chunk_file in chunks:
            chunk_path = os.path.join(temp_dir, chunk_file)
            with open(chunk_path, "rb") as infile:
                shutil.copyfileobj(infile, outfile)
            os.remove(chunk_path)
    
    # Eliminar directorio temporal y metadatos
    os.remove(f"{temp_dir}/metadata.json")
    os.rmdir(temp_dir)
    
    # Detectar tipo de archivo
    mime_type, _ = mimetypes.guess_type(metadata["file_name"])
    file_type = "document"
    if mime_type:
        if mime_type.startswith("image/"):
            file_type = "image"
        elif mime_type.startswith("video/"):
            file_type = "video"
        elif mime_type.startswith("audio/"):
            file_type = "audio"
    
    # URL pública
    file_url = f"/uploads/tasks/{task_id}/{safe_filename}"
    
    # Guardar en base de datos
    evidence = TaskEvidence(
        task_id=task_id,
        file_name=metadata["file_name"],
        file_url=file_url,
        file_type=file_type,
        file_size=metadata["file_size"],
        comment=comment,
        uploaded_by=current_user.id,
        status="pending",
        delivery_date=datetime.now()
    )
    
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    
    # Obtener nombre del usuario
    uploader_name = current_user.name
    
    return {
        "id": evidence.id,
        "task_id": evidence.task_id,
        "file_name": evidence.file_name,
        "file_url": evidence.file_url,
        "file_type": evidence.file_type,
        "file_size": evidence.file_size,
        "comment": evidence.comment,
        "uploaded_by": evidence.uploaded_by,
        "uploaded_by_name": uploader_name,
        "status": evidence.status,
        "delivery_date": evidence.delivery_date,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


# ==================== ENDPOINTS PARA EVIDENCIA (SIMPLE) ====================

@router.post("/{task_id}/evidence", response_model=TaskEvidenceResponse)
async def upload_evidence_simple(
    task_id: int,
    file: UploadFile = File(...),
    comment: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Subir evidencia a una tarea (solo para archivos pequeños < 20MB)
    """
    # Verificar que la tarea existe
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    # Verificar permisos
    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir evidencia a esta tarea"
        )
    
    # Crear directorio si no existe
    upload_dir = f"{BASE_UPLOAD_DIR}/{task_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Detectar tipo de archivo
    mime_type, _ = mimetypes.guess_type(file.filename)
    
    # Clasificar tipo de archivo
    file_type = "document"
    if mime_type:
        if mime_type.startswith("image/"):
            file_type = "image"
        elif mime_type.startswith("video/"):
            file_type = "video"
        elif mime_type.startswith("audio/"):
            file_type = "audio"
    
    # Guardar archivo con nombre seguro
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    # Leer y guardar archivo
    file_content = await file.read()
    file_size = len(file_content)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # URL pública del archivo
    file_url = f"/uploads/tasks/{task_id}/{safe_filename}"
    
    # Guardar en la base de datos
    evidence = TaskEvidence(
        task_id=task_id,
        file_name=file.filename,
        file_url=file_url,
        file_type=file_type,
        file_size=file_size,
        comment=comment,
        uploaded_by=current_user.id,
        status="pending",
        delivery_date=datetime.now()
    )
    
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    
    # Obtener nombre del usuario que subió
    uploader_name = current_user.name
    
    return {
        "id": evidence.id,
        "task_id": evidence.task_id,
        "file_name": evidence.file_name,
        "file_url": evidence.file_url,
        "file_type": evidence.file_type,
        "file_size": evidence.file_size,
        "comment": evidence.comment,
        "uploaded_by": evidence.uploaded_by,
        "uploaded_by_name": uploader_name,
        "status": evidence.status,
        "delivery_date": evidence.delivery_date,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


@router.get("/{task_id}/evidence", response_model=List[TaskEvidenceResponse])
def get_task_evidence(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener toda la evidencia de una tarea
    """
    # Verificar que la tarea existe
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    # Verificar permisos
    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver esta evidencia"
        )
    
    evidence = db.query(TaskEvidence).filter(
        TaskEvidence.task_id == task_id
    ).order_by(TaskEvidence.created_at.desc()).all()
    
    # Agregar nombre del usuario que subió
    result = []
    for item in evidence:
        uploader = db.query(User).filter(User.id == item.uploaded_by).first()
        reviewer = db.query(User).filter(User.id == item.reviewed_by).first() if item.reviewed_by else None
        result.append({
            "id": item.id,
            "task_id": item.task_id,
            "file_name": item.file_name,
            "file_url": item.file_url,
            "file_type": item.file_type,
            "file_size": item.file_size,
            "comment": item.comment,
            "uploaded_by": item.uploaded_by,
            "uploaded_by_name": uploader.name if uploader else None,
            "status": item.status or "pending",
            "review_comment": item.review_comment,
            "reviewed_by": item.reviewed_by,
            "reviewed_by_name": reviewer.name if reviewer else None,
            "reviewed_at": item.reviewed_at,
            "delivery_date": item.delivery_date,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        })
    
    return result


@router.delete("/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Eliminar evidencia (solo el usuario que la subió o admin)
    """
    evidence = db.query(TaskEvidence).filter(TaskEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")
    
    # Verificar permisos
    if current_user.role != "admin" and evidence.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta evidencia"
        )
    
    # Eliminar archivo físico si existe
    file_path = evidence.file_url.lstrip('/')
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.delete(evidence)
    db.commit()


# ==================== ENDPOINTS PARA APROBACIÓN DE EVIDENCIA ====================

@router.put("/evidence/{evidence_id}/approve")
def approve_evidence(
    evidence_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Aprobar evidencia (solo admin)
    """
    evidence = db.query(TaskEvidence).filter(TaskEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")
    
    evidence.status = "approved"
    evidence.reviewed_by = current_user.id
    evidence.reviewed_at = datetime.now()
    evidence.review_comment = None
    
    db.commit()
    
    return {
        "id": evidence.id,
        "status": evidence.status,
        "message": "Evidencia aprobada exitosamente"
    }


@router.put("/evidence/{evidence_id}/reject")
def reject_evidence(
    evidence_id: int,
    reason: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Rechazar evidencia con motivo (solo admin)
    """
    evidence = db.query(TaskEvidence).filter(TaskEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")
    
    evidence.status = "rejected"
    evidence.reviewed_by = current_user.id
    evidence.reviewed_at = datetime.now()
    evidence.review_comment = reason
    
    db.commit()
    
    return {
        "id": evidence.id,
        "status": evidence.status,
        "review_comment": evidence.review_comment,
        "message": "Evidencia rechazada"
    }


# ==================== ENDPOINTS PARA ACTUALIZAR FECHA DE ENTREGA ====================

@router.put("/evidence/{evidence_id}/delivery-date")
def update_delivery_date(
    evidence_id: int,
    delivery_date: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Actualizar fecha de entrega de la evidencia (solo admin)
    """
    evidence = db.query(TaskEvidence).filter(TaskEvidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")
    
    try:
        # Convertir la fecha string a datetime
        new_date = datetime.fromisoformat(delivery_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha inválido. Use YYYY-MM-DD"
        )
    
    evidence.delivery_date = new_date
    db.commit()
    
    return {
        "id": evidence.id,
        "delivery_date": evidence.delivery_date,
        "message": "Fecha de entrega actualizada exitosamente"
    }