# app/schemas/analisis.py

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum

# ============================================
# ENUMS
# ============================================
class TipoAnalisis(str, Enum):
    PCA = "pca"
    REGRESION = "regresion"
    REGRESION_GASTO_TIEMPO = "regresion_gasto_tiempo"
    REGRESION_RENDIMIENTO_EMPLEADO = "regresion_rendimiento_empleado"
    REGRESION_PRESUPUESTO_PLAZO = "regresion_presupuesto_plazo"
    CLUSTERING = "clustering"
    CURVA_S = "curva_s"
    DESVIACION_PLAZOS = "desviacion_plazos"
    ESTADISTICAS = "estadisticas"
    PREDICCION_FIN = "prediccion_fin"


class NivelRiesgo(str, Enum):
    BAJO = "bajo"
    MEDIO = "medio"
    ALTO = "alto"
    CRITICO = "critico"
    N_A = "n/a"


# ============================================
# SCHEMAS DE CONFIGURACIÓN
# ============================================
class ConfiguracionAnalisisBase(BaseModel):
    """Base para configuración de análisis"""
    tipo_analisis: TipoAnalisis
    nombre: Optional[str] = Field(None, max_length=255)
    descripcion: Optional[str] = None
    version: str = "2.0.0"


class ConfiguracionRegresionGastoTiempo(ConfiguracionAnalisisBase):
    """Configuración para regresión Gasto vs Tiempo"""
    variable_dependiente: str = "costo_tarea"
    variable_tiempo: str = "dias_desde_inicio"
    umbral_alerta: float = Field(20, ge=0, le=100)
    dias_proyectar: int = Field(30, ge=1, le=365)
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.REGRESION_GASTO_TIEMPO:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.REGRESION_GASTO_TIEMPO}")
        return v


class ConfiguracionRegresionRendimientoEmpleado(ConfiguracionAnalisisBase):
    """Configuración para regresión Rendimiento de Empleado"""
    empleado_analizado: Optional[str] = None
    umbral_dias_retraso: int = Field(5, ge=0)
    tendencia_ventana: int = Field(10, ge=3)
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.REGRESION_RENDIMIENTO_EMPLEADO:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.REGRESION_RENDIMIENTO_EMPLEADO}")
        return v


class ConfiguracionRegresionPresupuestoPlazo(ConfiguracionAnalisisBase):
    """Configuración para regresión Presupuesto vs Plazo"""
    umbral_riesgo: float = Field(0.8, ge=0.5, le=1.5)
    calcular_fecha_quiebre: bool = True
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.REGRESION_PRESUPUESTO_PLAZO:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.REGRESION_PRESUPUESTO_PLAZO}")
        return v


class ConfiguracionCurvaS(ConfiguracionAnalisisBase):
    """Configuración para análisis Curva S"""
    incluir_tendencia_lineal: bool = True
    incluir_bandas_confianza: bool = True
    nivel_confianza: float = Field(0.95, ge=0.8, le=0.99)
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.CURVA_S:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.CURVA_S}")
        return v


class ConfiguracionPCABase(ConfiguracionAnalisisBase):
    """Configuración para PCA"""
    n_componentes: int = Field(2, ge=1, le=10)
    variables: List[str] = Field(..., min_length=2)
    escalar_datos: bool = True
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.PCA:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.PCA}")
        return v


class ConfiguracionRegresionBase(ConfiguracionAnalisisBase):
    """Configuración para Regresión Lineal"""
    variable_dependiente: str
    variables_independientes: List[str] = Field(..., min_length=1)
    test_size: float = Field(0.2, ge=0.1, le=0.4)
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.REGRESION:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.REGRESION}")
        return v


class ConfiguracionClusteringBase(ConfiguracionAnalisisBase):
    """Configuración para Clustering"""
    n_clusters: int = Field(3, ge=2, le=10)
    variables: List[str] = Field(..., min_length=2)
    random_state: int = 42
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.CLUSTERING:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.CLUSTERING}")
        return v


class ConfiguracionDesviacionPlazos(ConfiguracionAnalisisBase):
    """Configuración para análisis de desviación de plazos"""
    umbral_dias_critico: int = Field(5, ge=0)
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.DESVIACION_PLAZOS:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.DESVIACION_PLAZOS}")
        return v


class ConfiguracionPrediccionFin(ConfiguracionAnalisisBase):
    """Configuración para predicción de fecha de fin"""
    metodo: str = Field("regresion_lineal", pattern="^(regresion_lineal|promedio|curva_s)$")
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.PREDICCION_FIN:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.PREDICCION_FIN}")
        return v


class ConfiguracionEstadisticas(ConfiguracionAnalisisBase):
    """Configuración para estadísticas descriptivas"""
    variables: Optional[List[str]] = None
    
    @validator('tipo_analisis')
    def validate_tipo(cls, v):
        if v != TipoAnalisis.ESTADISTICAS:
            raise ValueError(f"Tipo debe ser {TipoAnalisis.ESTADISTICAS}")
        return v


# ============================================
# SCHEMAS DE RESULTADOS
# ============================================
class ResultadoRegresionGastoTiempo(BaseModel):
    """Resultado del análisis Gasto vs Tiempo"""
    ecuacion: str
    pendiente: float
    intercepto: float
    r2_score: float
    mse: float
    gasto_estimado_final: float
    desviacion_porcentaje: float
    presupuesto_total: float
    n_muestras: int
    dias_proyectados: int
    max_dias: float
    predicciones_futuras: Dict[str, List[float]]


class ResultadoRegresionRendimientoEmpleado(BaseModel):
    """Resultado del análisis de rendimiento de empleado"""
    empleado: str
    pendiente: float
    intercepto: float
    r2_score: float
    tendencia: str
    mensaje_tendencia: str
    total_tareas: int
    tareas_retrasadas: int
    promedio_retraso: float
    desviacion_retraso: float
    riesgo_sobrecarga: float
    prediccion_proxima_tarea: float
    datos_retrasos: List[float]


class ResultadoRegresionPresupuestoPlazo(BaseModel):
    """Resultado del análisis Presupuesto vs Plazo"""
    pendiente: float
    intercepto: float
    r2_score: float
    cpi_promedio: float
    spi_promedio: float
    presupuesto_total: float
    dias_quiebre: Optional[float]
    fecha_quiebre: Optional[str]
    dias_fin_estimados: float
    n_muestras: int


class ResultadoCurvaS(BaseModel):
    """Resultado del análisis Curva S"""
    desviacion_curva: List[float]
    avance_fisico: List[float]
    avance_financiero: List[float]
    curva_s_teorica: List[float]
    desviacion_promedio: float
    pendiente_tendencia: float
    r2_tendencia: float
    n_muestras: int


class ResultadoDesviacionPlazos(BaseModel):
    """Resultado del análisis de desviación de plazos"""
    desviacion_promedio: float
    desviacion_maxima: float
    desviacion_minima: float
    desviacion_std: float
    total_tareas_retrasadas: int
    total_tareas: int
    tareas_criticas: List[Dict[str, Any]]
    tareas_con_holgura: List[Dict[str, Any]]
    impacto_fecha_fin: float
    probabilidad_cumplir_plazo: float
    retrasos: List[float]


class ResultadoPrediccionFin(BaseModel):
    """Resultado de la predicción de fecha de fin"""
    dias_totales_estimados: float
    fecha_estimada_fin: Optional[str]
    fecha_planeada_fin: Optional[str]
    dias_diferencia: int
    r2_score: float
    pendiente: float
    intercepto: float
    probabilidad_cumplir: float
    n_muestras: int


# ============================================
# SCHEMAS DE RESPUESTA (UNIFICADOS)
# ============================================
class AnalisisReporteResponse(BaseModel):
    """Respuesta completa de un análisis"""
    id: int
    reporte_id: int
    tipo_analisis: str
    nombre: Optional[str]
    descripcion: Optional[str]
    
    # Configuración
    configuracion: Dict[str, Any]
    metadata_analisis: Optional[Dict[str, Any]]
    
    # Resultados (flexible para diferentes tipos)
    resultados: Optional[Union[
        ResultadoRegresionGastoTiempo,
        ResultadoRegresionRendimientoEmpleado,
        ResultadoRegresionPresupuestoPlazo,
        ResultadoCurvaS,
        ResultadoDesviacionPlazos,
        ResultadoPrediccionFin,
        Dict[str, Any]  # Fallback
    ]]
    
    # Gráficas
    datos_grafica: Optional[Dict[str, Any]]
    grafica_principal: Optional[str]
    graficas_adicionales: Optional[List[str]]
    
    # Métricas
    nivel_riesgo: Optional[str]
    nivel_confianza: Optional[float]
    alertas: Optional[List[Dict[str, Any]]]
    recomendaciones: Optional[List[str]]
    
    # Metadata
    empleado_analizado: Optional[str]
    variable_dependiente: Optional[str]
    variables_independientes: Optional[List[str]]
    
    # Ejecución
    fecha_ejecucion: datetime
    tiempo_ejecucion_ms: Optional[int]
    version_algoritmo: Optional[str]
    
    # Control
    activo: bool
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }


class AnalisisReporteCreate(BaseModel):
    """Creación de un análisis"""
    reporte_id: int
    configuracion: Dict[str, Any]


class AnalisisReporteUpdate(BaseModel):
    """Actualización de un análisis"""
    nombre: Optional[str] = Field(None, max_length=255)
    descripcion: Optional[str] = None
    resultados: Optional[Dict[str, Any]] = None
    datos_grafica: Optional[Dict[str, Any]] = None
    grafica_principal: Optional[str] = None
    graficas_adicionales: Optional[List[str]] = None
    alertas: Optional[List[Dict[str, Any]]] = None
    recomendaciones: Optional[List[str]] = None
    nivel_riesgo: Optional[str] = None
    nivel_confianza: Optional[float] = Field(None, ge=0, le=1)
    activo: Optional[bool] = None


class AnalisisResumenResponse(BaseModel):
    """Resumen de todos los análisis de un reporte"""
    reporte_id: int
    total_analisis: int
    fecha_generacion: str
    analisis: List[Dict[str, Any]]


# ============================================
# SCHEMAS PARA DASHBOARD (NUEVO)
# ============================================

class DashboardKPIs(BaseModel):
    """KPIs del dashboard"""
    totalProyectos: int
    totalEmpleados: int
    totalClientes: int
    tareasPendientes: int
    tareasCompletadas: int
    proyectosActivos: int
    horasTotales: int


class DashboardProyectoEstado(BaseModel):
    """Proyecto por estado"""
    name: str
    value: int


class DashboardTareaPrioridad(BaseModel):
    """Tarea por prioridad"""
    name: str
    value: int


class DashboardTareaProyecto(BaseModel):
    """Tareas por proyecto"""
    name: str
    completadas: int
    enProgreso: int
    pendientes: int


class DashboardHorasDiarias(BaseModel):
    """Horas diarias"""
    fecha: str
    horas: float


class DashboardPrediccionHoras(BaseModel):
    """Predicción de horas"""
    fecha: str
    horas: Optional[float]
    prediccion: float


class DashboardCargaEmpleado(BaseModel):
    """Carga de trabajo por empleado"""
    name: str
    pendientes: int
    enProgreso: int
    completadas: int
    eficiencia: int


class DashboardProyectoRiesgo(BaseModel):
    """Proyecto en riesgo"""
    name: str
    progreso: float
    diasRestantes: int
    riesgo: str  # critical, warning, safe


class DashboardTopCliente(BaseModel):
    """Top cliente por presupuesto"""
    name: str
    presupuesto: float


class DashboardClienteIndustria(BaseModel):
    """Cliente por industria"""
    name: str
    value: int


class DashboardEficienciaProyecto(BaseModel):
    """Eficiencia por proyecto"""
    name: str
    estimado: float
    real: float


class DashboardAnalisisResponse(BaseModel):
    """Respuesta completa del dashboard de análisis"""
    kpis: DashboardKPIs
    proyectosPorEstado: List[DashboardProyectoEstado]
    tareasPorPrioridad: List[DashboardTareaPrioridad]
    tareasPorProyecto: List[DashboardTareaProyecto]
    horasDiarias: List[DashboardHorasDiarias]
    prediccionHoras: List[DashboardPrediccionHoras]
    cargaEmpleados: List[DashboardCargaEmpleado]
    proyectosRiesgo: List[DashboardProyectoRiesgo]
    topClientes: List[DashboardTopCliente]
    clientesIndustria: List[DashboardClienteIndustria]
    eficienciaProyectos: List[DashboardEficienciaProyecto]