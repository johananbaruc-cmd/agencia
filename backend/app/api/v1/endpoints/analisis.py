from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin  # ← CAMBIAR AQUÍ
from app.models.user import User
from app.models.analisis_reporte import AnalisisReporte
from app.schemas.analisis import (
    AnalisisReporteResponse,
    ConfiguracionPCABase,
    ConfiguracionRegresionBase,
    ConfiguracionClusteringBase
)
from app.services.analisis_service import AnalisisService
from app.services.reporte_service import ReporteService

router = APIRouter()

@router.post("/reportes/{reporte_id}/analisis", response_model=AnalisisReporteResponse)
def ejecutar_analisis(
    reporte_id: int,
    configuracion: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Ejecuta un análisis de datos en el reporte
    """
    reporte = ReporteService.obtener_reporte(reporte_id, db)
    
    if reporte.estado == "publicado":
        raise HTTPException(
            status_code=400,
            detail="No se pueden ejecutar análisis en un reporte ya publicado"
        )
    
    return AnalisisService.ejecutar_analisis(reporte_id, configuracion, db)


@router.get("/reportes/{reporte_id}/analisis", response_model=List[AnalisisReporteResponse])
def listar_analisis(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Lista todos los análisis de un reporte
    """
    return db.query(AnalisisReporte).filter(
        AnalisisReporte.reporte_id == reporte_id,
        AnalisisReporte.activo == True
    ).all()


@router.get("/reportes/analisis/{analisis_id}", response_model=AnalisisReporteResponse)
def obtener_analisis(
    analisis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Obtiene un análisis específico
    """
    analisis = db.query(AnalisisReporte).filter(
        AnalisisReporte.id == analisis_id,
        AnalisisReporte.activo == True
    ).first()
    
    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    
    return analisis


@router.delete("/reportes/analisis/{analisis_id}")
def eliminar_analisis(
    analisis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Elimina un análisis (soft delete)
    """
    analisis = db.query(AnalisisReporte).filter(
        AnalisisReporte.id == analisis_id,
        AnalisisReporte.activo == True
    ).first()
    
    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    
    analisis.activo = False
    db.commit()
    
    return {"message": "Análisis eliminado exitosamente"}


@router.post("/reportes/{reporte_id}/analisis/pca", response_model=AnalisisReporteResponse)
def configurar_pca(
    reporte_id: int,
    config: ConfiguracionPCABase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Configura y ejecuta análisis PCA
    """
    config_dict = config.model_dump()
    config_dict['tipo_analisis'] = 'pca'
    
    return AnalisisService.ejecutar_analisis(reporte_id, config_dict, db)


@router.post("/reportes/{reporte_id}/analisis/regresion", response_model=AnalisisReporteResponse)
def configurar_regresion(
    reporte_id: int,
    config: ConfiguracionRegresionBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Configura y ejecuta análisis de regresión lineal
    """
    config_dict = config.model_dump()
    config_dict['tipo_analisis'] = 'regresion'
    
    return AnalisisService.ejecutar_analisis(reporte_id, config_dict, db)


@router.post("/reportes/{reporte_id}/analisis/clustering", response_model=AnalisisReporteResponse)
def configurar_clustering(
    reporte_id: int,
    config: ConfiguracionClusteringBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Configura y ejecuta análisis de clustering
    """
    config_dict = config.model_dump()
    config_dict['tipo_analisis'] = 'clustering'
    
    return AnalisisService.ejecutar_analisis(reporte_id, config_dict, db)


@router.post("/reportes/{reporte_id}/analisis/estadisticas", response_model=AnalisisReporteResponse)
def ejecutar_estadisticas(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← CAMBIAR AQUÍ
):
    """
    Ejecuta análisis estadístico descriptivo
    """
    config_dict = {
        'tipo_analisis': 'estadisticas',
        'nombre': 'Estadísticas Descriptivas',
        'descripcion': 'Análisis estadístico de las métricas del proyecto'
    }
    
    return AnalisisService.ejecutar_analisis(reporte_id, config_dict, db)