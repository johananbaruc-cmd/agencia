from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.reporte import ReporteProyecto
from app.models.interaccion_cliente import InteraccionCliente
from app.schemas.reporte import (
    ReporteCreate,
    ReporteUpdate,
    ReporteResponse,
    ReporteConDetalles,
    ReportePublicar,
    ReportePublicadoResponse
)
from app.schemas.interaccion import InteraccionClienteResponse
from app.services.reporte_service import ReporteService

router = APIRouter()

@router.post("/reportes", response_model=ReporteResponse)
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
    Obtiene un reporte por ID con todos sus detalles
    """
    return ReporteService.obtener_reporte(reporte_id, db, incluir_detalles)


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


@router.delete("/reportes/{reporte_id}")
def eliminar_reporte(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    ✅ Elimina un reporte (eliminación física) - PERMITE ELIMINAR EN CUALQUIER ESTADO
    """
    # Buscar el reporte
    reporte = db.query(ReporteProyecto).filter(ReporteProyecto.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    # ✅ ELIMINAR SIN IMPORTAR EL ESTADO (borrador, publicado o expirado)
    db.delete(reporte)
    db.commit()
    
    return {"message": "Reporte eliminado exitosamente"}


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


# ✅ NUEVO ENDPOINT: Obtener interacciones de un reporte (admin)
@router.get("/reportes/{reporte_id}/interacciones", response_model=List[InteraccionClienteResponse])
def obtener_interacciones_reporte(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Obtiene todas las interacciones (respuestas) de un reporte específico.
    Solo accesible para administradores.
    """
    # Verificar que el reporte existe
    reporte = db.query(ReporteProyecto).filter(ReporteProyecto.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    # Obtener todas las interacciones del reporte
    interacciones = db.query(InteraccionCliente).filter(
        InteraccionCliente.reporte_id == reporte_id
    ).order_by(InteraccionCliente.fecha_visto.desc()).all()
    
    return interacciones