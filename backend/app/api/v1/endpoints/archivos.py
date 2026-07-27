from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin  # ← CAMBIAR AQUÍ
from app.models.user import User
from app.schemas.archivo import (
    ArchivoReporteResponse,
    ArchivoReporteUpdate,
    ArchivoEliminarResponse
)
from app.services.archivo_service import ArchivoService
from app.services.reporte_service import ReporteService

router = APIRouter()

@router.post("/reportes/{reporte_id}/archivos", response_model=ArchivoReporteResponse)
def subir_archivo(
    reporte_id: int,
    archivo: UploadFile = File(...),
    descripcion: Optional[str] = Form(None),
    es_grafica: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Sube un archivo a un reporte
    """
    reporte = ReporteService.obtener_reporte(reporte_id, db)
    
    if reporte.estado == "publicado":
        raise HTTPException(
            status_code=400,
            detail="No se pueden subir archivos a un reporte ya publicado"
        )
    
    return ArchivoService.guardar_archivo(
        archivo, reporte_id, db, descripcion, es_grafica
    )


@router.get("/reportes/{reporte_id}/archivos", response_model=List[ArchivoReporteResponse])
def listar_archivos(
    reporte_id: int,
    solo_graficas: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Lista todos los archivos de un reporte
    """
    return ArchivoService.obtener_archivos_reporte(reporte_id, db, solo_graficas)


@router.put("/reportes/archivos/{archivo_id}", response_model=ArchivoReporteResponse)
def actualizar_archivo(
    archivo_id: int,
    datos: ArchivoReporteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Actualiza metadatos de un archivo
    """
    return ArchivoService.actualizar_archivo(archivo_id, datos, db)


@router.delete("/reportes/archivos/{archivo_id}", response_model=ArchivoEliminarResponse)
def eliminar_archivo(
    archivo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Elimina un archivo de un reporte
    """
    ArchivoService.eliminar_archivo(archivo_id, db)
    return ArchivoEliminarResponse(
        id=archivo_id,
        mensaje="Archivo eliminado exitosamente"
    )