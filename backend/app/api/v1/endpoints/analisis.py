# app/api/v1/endpoints/analisis.py

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.core.database import get_db
from app.core.deps import require_admin, require_employee_or_admin
from app.models.user import User
from app.models.reporte import ReporteProyecto
from app.models.analisis_reporte import AnalisisReporte
from app.schemas.analisis import (
    AnalisisReporteResponse,
    AnalisisReporteUpdate,
    AnalisisResumenResponse,
    ConfiguracionRegresionGastoTiempo,
    ConfiguracionRegresionRendimientoEmpleado,
    ConfiguracionRegresionPresupuestoPlazo,
    ConfiguracionCurvaS,
    ConfiguracionPCABase,
    ConfiguracionRegresionBase,
    ConfiguracionClusteringBase,
    ConfiguracionDesviacionPlazos,
    ConfiguracionPrediccionFin,
    ConfiguracionEstadisticas,
    TipoAnalisis
)
from app.services.analisis_service import AnalisisService

router = APIRouter()


# ============================================
# 1. EJECUTAR ANÁLISIS (GENÉRICO) - SOLO ADMIN
# ============================================
@router.post(
    "/reportes/{reporte_id}/analisis",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis(
    reporte_id: int,
    configuracion: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Ejecuta un análisis de datos en el reporte
    """
    reporte = db.query(ReporteProyecto).filter(
        ReporteProyecto.id == reporte_id,
        ReporteProyecto.activo == True
    ).first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    # ✅ PERMITIR ANÁLISIS EN REPORTES PUBLICADOS (comentado)
    # if reporte.estado == "publicado":
    #     raise HTTPException(
    #         status_code=400,
    #         detail="No se pueden ejecutar análisis en un reporte ya publicado"
    #     )
    
    tipo = configuracion.get('tipo_analisis')
    if not tipo:
        raise HTTPException(status_code=400, detail="Debes especificar 'tipo_analisis'")
    
    try:
        TipoAnalisis(tipo)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo '{tipo}' no válido. Opciones: {[t.value for t in TipoAnalisis]}"
        )
    
    db.query(AnalisisReporte).filter(
        AnalisisReporte.reporte_id == reporte_id,
        AnalisisReporte.tipo_analisis == tipo,
        AnalisisReporte.activo == True
    ).update({"activo": False})
    db.commit()
    
    try:
        resultado = AnalisisService.ejecutar_analisis(reporte_id, configuracion, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al ejecutar análisis: {str(e)}")
    
    reporte.fecha_actualizacion = func.now()
    db.commit()
    
    return resultado


# ============================================
# 2. EJECUTAR ANÁLISIS ESPECÍFICOS (SOLO ADMIN)
# ============================================
@router.post(
    "/reportes/{reporte_id}/analisis/gasto-tiempo",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_gasto_tiempo(
    reporte_id: int,
    config: ConfiguracionRegresionGastoTiempo,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/rendimiento-empleado",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_rendimiento_empleado(
    reporte_id: int,
    config: ConfiguracionRegresionRendimientoEmpleado,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/presupuesto-plazo",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_presupuesto_plazo(
    reporte_id: int,
    config: ConfiguracionRegresionPresupuestoPlazo,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/curva-s",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_curva_s(
    reporte_id: int,
    config: ConfiguracionCurvaS,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/desviacion-plazos",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_desviacion_plazos(
    reporte_id: int,
    config: ConfiguracionDesviacionPlazos,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/prediccion-fin",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_prediccion_fin(
    reporte_id: int,
    config: ConfiguracionPrediccionFin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/pca",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_pca(
    reporte_id: int,
    config: ConfiguracionPCABase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/regresion",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_regresion(
    reporte_id: int,
    config: ConfiguracionRegresionBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/clustering",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_clustering(
    reporte_id: int,
    config: ConfiguracionClusteringBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


@router.post(
    "/reportes/{reporte_id}/analisis/estadisticas",
    response_model=AnalisisReporteResponse,
    status_code=status.HTTP_201_CREATED
)
def ejecutar_analisis_estadisticas(
    reporte_id: int,
    config: ConfiguracionEstadisticas,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return _ejecutar_analisis_tipado(reporte_id, config.dict(), db)


def _ejecutar_analisis_tipado(
    reporte_id: int,
    config: Dict[str, Any],
    db: Session
) -> AnalisisReporte:
    """Función auxiliar para ejecutar análisis tipados"""
    reporte = db.query(ReporteProyecto).filter(
        ReporteProyecto.id == reporte_id,
        ReporteProyecto.activo == True
    ).first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    # ✅ PERMITIR ANÁLISIS EN REPORTES PUBLICADOS (comentado)
    # if reporte.estado == "publicado":
    #     raise HTTPException(
    #         status_code=400,
    #         detail="No se pueden ejecutar análisis en un reporte ya publicado"
    #     )
    
    tipo = config.get('tipo_analisis')
    db.query(AnalisisReporte).filter(
        AnalisisReporte.reporte_id == reporte_id,
        AnalisisReporte.tipo_analisis == tipo,
        AnalisisReporte.activo == True
    ).update({"activo": False})
    db.commit()
    
    try:
        resultado = AnalisisService.ejecutar_analisis(reporte_id, config, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    
    reporte.fecha_actualizacion = func.now()
    db.commit()
    
    return resultado


# ============================================
# 3. LISTAR ANÁLISIS (ADMIN O EMPLEADO)
# ============================================
@router.get(
    "/reportes/{reporte_id}/analisis",
    response_model=List[AnalisisReporteResponse]
)
def listar_analisis(
    reporte_id: int,
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
    incluir_inactivos: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee_or_admin)
):
    """Lista todos los análisis de un reporte"""
    reporte = db.query(ReporteProyecto).filter(
        ReporteProyecto.id == reporte_id,
        ReporteProyecto.activo == True
    ).first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    query = db.query(AnalisisReporte).filter(
        AnalisisReporte.reporte_id == reporte_id,
        AnalisisReporte.activo == True
    )
    
    if not incluir_inactivos:
        query = query.filter(AnalisisReporte.activo == True)
    
    if tipo:
        query = query.filter(AnalisisReporte.tipo_analisis == tipo)
    
    return query.order_by(AnalisisReporte.fecha_ejecucion.desc()).all()


# ============================================
# 4. OBTENER ANÁLISIS POR ID (ADMIN O EMPLEADO)
# ============================================
@router.get(
    "/reportes/analisis/{analisis_id}",
    response_model=AnalisisReporteResponse
)
def obtener_analisis(
    analisis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee_or_admin)
):
    """Obtiene un análisis específico"""
    analisis = db.query(AnalisisReporte).filter(
        AnalisisReporte.id == analisis_id,
        AnalisisReporte.activo == True
    ).first()
    
    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    
    if not analisis.activo:
        raise HTTPException(status_code=410, detail="El análisis ha sido eliminado")
    
    return analisis


# ============================================
# 5. ACTUALIZAR ANÁLISIS (SOLO ADMIN)
# ============================================
@router.put(
    "/reportes/analisis/{analisis_id}",
    response_model=AnalisisReporteResponse
)
def actualizar_analisis(
    analisis_id: int,
    update_data: AnalisisReporteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Actualiza un análisis existente"""
    analisis = db.query(AnalisisReporte).filter(
        AnalisisReporte.id == analisis_id,
        AnalisisReporte.activo == True
    ).first()
    
    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(analisis, key, value)
    
    analisis.fecha_actualizacion = func.now()
    db.commit()
    db.refresh(analisis)
    
    return analisis


# ============================================
# 6. ELIMINAR ANÁLISIS (SOLO ADMIN)
# ============================================
@router.delete(
    "/reportes/analisis/{analisis_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def eliminar_analisis(
    analisis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Elimina un análisis (soft delete)"""
    analisis = db.query(AnalisisReporte).filter(
        AnalisisReporte.id == analisis_id,
        AnalisisReporte.activo == True
    ).first()
    
    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    
    analisis.activo = False
    db.commit()
    
    return None


# ============================================
# 7. EJECUTAR TODOS LOS ANÁLISIS (EMPLEADO O ADMIN)
# ============================================
@router.post(
    "/reportes/{reporte_id}/analisis/ejecutar-todos"
)
def ejecutar_analisis_seleccionados(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee_or_admin)  # ✅ Cambiado para permitir empleados
):
    """
    Ejecuta TODOS los análisis seleccionados en la configuración del reporte
    🔥 PERMITE EJECUCIÓN EN REPORTES PUBLICADOS
    """
    reporte = db.query(ReporteProyecto).filter(
        ReporteProyecto.id == reporte_id,
        ReporteProyecto.activo == True
    ).first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    # 🔥 PERMITIR ANÁLISIS EN REPORTES PUBLICADOS
    # (comentado para permitir ejecución desde el frontend)
    # if reporte.estado == "publicado":
    #     raise HTTPException(
    #         status_code=400,
    #         detail="No se pueden ejecutar análisis en un reporte ya publicado"
    #     )
    
    config_analisis = reporte.configuracion_analisis or {}
    
    # Verificar si hay análisis seleccionados
    if not any(config_analisis.values()):
        raise HTTPException(
            status_code=400,
            detail="No hay análisis seleccionados en la configuración del reporte"
        )
    
    resultado = AnalisisService.ejecutar_analisis_seleccionados(reporte_id, db)
    
    return resultado


# ============================================
# 8. RESUMEN DE ANÁLISIS (ADMIN O EMPLEADO)
# ============================================
@router.get(
    "/reportes/{reporte_id}/analisis/resumen",
    response_model=AnalisisResumenResponse
)
def obtener_resumen_analisis(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee_or_admin)
):
    """Obtiene un resumen de todos los análisis del reporte"""
    reporte = db.query(ReporteProyecto).filter(
        ReporteProyecto.id == reporte_id,
        ReporteProyecto.activo == True
    ).first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    return AnalisisService.obtener_resumen_analisis(reporte_id, db)


# ============================================
# 9. TIPOS DE ANÁLISIS (EMPLEADO O ADMIN)
# ============================================
@router.get("/analisis/tipos")
def obtener_tipos_analisis(
    current_user: User = Depends(require_employee_or_admin)
):
    """Obtiene la lista de tipos de análisis disponibles"""
    return [
        {
            'id': 'pca',
            'nombre': 'Análisis de Componentes Principales',
            'descripcion': 'Reducción de dimensionalidad para identificar patrones',
            'categoria': 'Estadístico',
            'requiere_datos': ['variables_numericas']
        },
        {
            'id': 'regresion',
            'nombre': 'Regresión Lineal General',
            'descripcion': 'Predicción de tendencias y relaciones entre variables',
            'categoria': 'Predictivo',
            'requiere_datos': ['variable_dependiente', 'variables_independientes']
        },
        {
            'id': 'regresion_gasto_tiempo',
            'nombre': 'Regresión: Gasto vs Tiempo',
            'descripcion': 'Análisis de desviación presupuestaria vs tiempo',
            'categoria': 'Financiero',
            'requiere_datos': ['presupuesto', 'fechas', 'costos']
        },
        {
            'id': 'regresion_rendimiento_empleado',
            'nombre': 'Regresión: Rendimiento del Empleado',
            'descripcion': 'Análisis de productividad y riesgo de sobrecarga',
            'categoria': 'Recursos Humanos',
            'requiere_datos': ['tareas', 'empleados', 'fechas']
        },
        {
            'id': 'regresion_presupuesto_plazo',
            'nombre': 'Regresión: Presupuesto vs Plazo',
            'descripcion': 'Análisis de eficiencia presupuesto-plazo (CPI/SPI)',
            'categoria': 'Financiero',
            'requiere_datos': ['presupuesto', 'progreso', 'tiempo']
        },
        {
            'id': 'clustering',
            'nombre': 'Clustering K-Means',
            'descripcion': 'Agrupación automática de tareas por rendimiento',
            'categoria': 'Agrupación',
            'requiere_datos': ['variables_numericas']
        },
        {
            'id': 'curva_s',
            'nombre': 'Curva S del Proyecto',
            'descripcion': 'Comparación de avance físico vs financiero',
            'categoria': 'Gestión de Proyectos',
            'requiere_datos': ['progreso', 'costos', 'tiempo']
        },
        {
            'id': 'desviacion_plazos',
            'nombre': 'Análisis de Desviación de Plazos',
            'descripcion': 'Identificación de tareas críticas y holguras',
            'categoria': 'Gestión de Proyectos',
            'requiere_datos': ['tareas', 'fechas', 'estados']
        },
        {
            'id': 'prediccion_fin',
            'nombre': 'Predicción de Fecha de Fin',
            'descripcion': 'Predicción de fecha de finalización del proyecto',
            'categoria': 'Predictivo',
            'requiere_datos': ['progreso', 'fechas', 'tareas']
        },
        {
            'id': 'estadisticas',
            'nombre': 'Estadísticas Descriptivas',
            'descripcion': 'Análisis estadístico completo del proyecto',
            'categoria': 'Estadístico',
            'requiere_datos': ['variables_numericas']
        }
    ]