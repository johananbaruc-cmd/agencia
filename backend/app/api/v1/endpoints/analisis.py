# app/api/v1/endpoints/analisis.py

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin, require_employee_or_admin
from app.models.user import User
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