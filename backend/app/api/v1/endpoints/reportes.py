# app/api/v1/endpoints/reportes.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.reporte import ReporteProyecto
from app.models.analisis_reporte import AnalisisReporte
from app.schemas.reporte import (
    ReporteCreate,
    ReporteUpdate,
    ReporteResponse,
    ReporteConDetalles,
    ReportePublicar,
    ReportePublicadoResponse
)
from app.services.reporte_service import ReporteService

router = APIRouter()


@router.post("/reportes", response_model=ReporteResponse, status_code=status.HTTP_201_CREATED)
def crear_reporte(
    datos: ReporteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Crea un nuevo reporte en estado borrador
    """
    if datos.admin_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No puedes crear un reporte para otro usuario"
        )
    
    return ReporteService.crear_reporte(datos, db)


@router.get("/proyectos/{project_id}/reportes", response_model=List[ReporteResponse])
def listar_reportes_proyecto(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Lista todos los reportes de un proyecto
    """
    return ReporteService.obtener_reportes_proyecto(project_id, db, skip, limit)


@router.get("/reportes/{reporte_id}", response_model=ReporteConDetalles)
def obtener_reporte(
    reporte_id: int,
    incluir_detalles: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Obtiene un reporte por ID con todos sus detalles incluyendo análisis
    """
    # ✅ CORREGIDO: Sin .filter() en joinedload
    query = db.query(ReporteProyecto).filter(
        ReporteProyecto.id == reporte_id,
        ReporteProyecto.activo == True
    )
    
    if incluir_detalles:
        query = query.options(
            joinedload(ReporteProyecto.archivos),
            joinedload(ReporteProyecto.analisis)  # ✅ Sin .filter()
        )
    
    reporte = query.first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    return reporte


@router.put("/reportes/{reporte_id}", response_model=ReporteResponse)
def actualizar_reporte(
    reporte_id: int,
    datos: ReporteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Actualiza un reporte existente (solo si está en borrador)
    """
    return ReporteService.actualizar_reporte(reporte_id, datos, db)


@router.post("/reportes/{reporte_id}/publicar", response_model=ReportePublicadoResponse)
def publicar_reporte(
    reporte_id: int,
    datos: ReportePublicar,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Publica un reporte y genera enlaces de acceso
    """
    from app.core.config import settings
    base_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    return ReporteService.publicar_reporte(reporte_id, datos, base_url, db)


@router.delete("/reportes/{reporte_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_reporte(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Elimina un reporte (soft delete)
    """
    reporte = db.query(ReporteProyecto).filter(
        ReporteProyecto.id == reporte_id,
        ReporteProyecto.activo == True
    ).first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    reporte.activo = False
    db.commit()
    
    return None


@router.get("/reportes/{reporte_id}/resumen")
def obtener_resumen_proyecto(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Obtiene el resumen del proyecto para el reporte
    """
    reporte = ReporteService.obtener_reporte(reporte_id, db)
    return ReporteService.obtener_resumen_proyecto(reporte.project_id, db)