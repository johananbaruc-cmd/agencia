from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ============================================
# ENUMS
# ============================================
class TipoAnalisis(str, Enum):
    PCA = "pca"
    REGRESION = "regresion"
    CLUSTERING = "clustering"
    ESTADISTICAS = "estadisticas"


# ============================================
# SCHEMAS BASE
# ============================================
class AnalisisReporteBase(BaseModel):
    tipo_analisis: TipoAnalisis
    nombre: Optional[str] = Field(None, max_length=255)
    descripcion: Optional[str] = None
    configuracion: Dict[str, Any]


class AnalisisReporteCreate(AnalisisReporteBase):
    reporte_id: int


class AnalisisReporteUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    resultados: Optional[Dict[str, Any]] = None
    datos_grafica: Optional[Dict[str, Any]] = None
    grafica_principal: Optional[str] = None
    graficas_adicionales: Optional[List[str]] = None
    activo: Optional[bool] = None


# ============================================
# SCHEMAS DE RESPUESTA
# ============================================
class AnalisisReporteResponse(AnalisisReporteBase):
    id: int
    reporte_id: int
    resultados: Optional[Dict[str, Any]] = None
    datos_grafica: Optional[Dict[str, Any]] = None
    grafica_principal: Optional[str] = None
    graficas_adicionales: Optional[List[str]] = None
    fecha_ejecucion: datetime
    tiempo_ejecucion_ms: Optional[int] = None
    activo: bool
    
    class Config:
        from_attributes = True


# ============================================
# SCHEMAS PARA CONFIGURACIÓN DE ANÁLISIS
# ============================================
class ConfiguracionPCABase(BaseModel):
    n_componentes: int = Field(2, ge=1, le=10)
    variables: List[str] = Field(..., min_length=2)
    escalar_datos: bool = True


class ConfiguracionRegresionBase(BaseModel):
    variable_dependiente: str
    variables_independientes: List[str] = Field(..., min_length=1)
    test_size: float = Field(0.2, ge=0.1, le=0.4)


class ConfiguracionClusteringBase(BaseModel):
    n_clusters: int = Field(3, ge=2, le=10)
    variables: List[str] = Field(..., min_length=2)
    random_state: int = 42


# ============================================
# SCHEMAS PARA RESULTADOS DE ANÁLISIS
# ============================================
class ResultadoPCAResponse(BaseModel):
    varianza_explicada: List[float]
    componentes: Dict[str, Dict[str, float]]
    datos_proyectados: List[List[float]]
    grafica: Optional[str] = None


class ResultadoRegresionResponse(BaseModel):
    coeficientes: Dict[str, float]
    intercepto: float
    r2_score: float
    mse: float
    predicciones: Optional[List[float]] = None
    grafica: Optional[str] = None


class ResultadoClusteringResponse(BaseModel):
    clusters: List[int]
    centroides: List[List[float]]
    inercia: float
    silhouette_score: float
    grafica: Optional[str] = None