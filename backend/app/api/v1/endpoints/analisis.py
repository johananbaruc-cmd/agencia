# app/api/v1/endpoints/analisis.py

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin, require_employee_or_admin
from app.models.user import User
from app.models.project import Project
from app.services.analisis_service import AnalisisService

router = APIRouter(prefix="/analisis", tags=["analisis"])


@router.get("/dashboard")
def get_dashboard_analisis(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    actualizar: bool = Query(False, description="Forzar actualización de datos")
):
    """
    Obtiene todos los datos del dashboard de análisis

    - **actualizar**: Si es True, recalcula los datos en lugar de usar caché
    """
    try:
        if actualizar:
            dashboard = AnalisisService.actualizar_dashboard(db)
        else:
            dashboard = AnalisisService.obtener_o_calcular_dashboard(db)

        return dashboard.to_response()

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener datos del dashboard: {str(e)}"
        )


@router.post("/dashboard/actualizar")
def actualizar_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Fuerza la actualización del dashboard
    """
    try:
        dashboard = AnalisisService.actualizar_dashboard(db)
        return {
            "mensaje": "Dashboard actualizado correctamente",
            "fecha_calculo": dashboard.creado_en.isoformat() if dashboard.creado_en else None,
            "tiempo_ms": dashboard.tiempo_calculo_ms
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar dashboard: {str(e)}"
        )


@router.get("/dashboard/estado")
def get_dashboard_estado(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Obtiene el estado del dashboard actual (fecha, versión, etc.)
    """
    dashboard = AnalisisService.obtener_dashboard_actual(db)

    if not dashboard:
        return {
            "existe": False,
            "mensaje": "No hay datos de dashboard. Ejecuta una actualización."
        }

    return {
        "existe": True,
        "fecha_calculo": dashboard.creado_en.isoformat() if dashboard.creado_en else None,
        "tiempo_calculo_ms": dashboard.tiempo_calculo_ms,
        "es_actual": dashboard.es_actual,
        "total_proyectos": dashboard.total_proyectos,
        "total_empleados": dashboard.total_empleados,
        "total_clientes": dashboard.total_clientes
    }


# ============================================
# NUEVO: Análisis por proyecto específico
# ============================================
@router.get("/proyecto/{project_id}")
def get_analisis_proyecto(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Obtiene el análisis detallado de un proyecto específico.
    
    - **project_id**: ID del proyecto a analizar.
    """
    try:
        analisis = AnalisisService.obtener_analisis_proyecto(db, project_id)
        
        if "error" in analisis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=analisis["error"]
            )
            
        return analisis

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener análisis del proyecto: {str(e)}"
        )


# ============================================
# NUEVO: Listar proyectos para el selector
# ============================================
@router.get("/proyectos/disponibles")
def get_proyectos_disponibles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Lista todos los proyectos disponibles para seleccionar en el análisis.
    """
    try:
        proyectos = db.query(Project).order_by(Project.name).all()
        return [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "progress": p.progress or 0,
                "end_date": p.end_date.isoformat() if p.end_date else None
            }
            for p in proyectos
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener proyectos: {str(e)}"
        )