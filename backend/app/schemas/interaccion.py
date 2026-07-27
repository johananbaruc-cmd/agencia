from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InteraccionClienteResponse(BaseModel):
    id: int
    reporte_id: int
    cliente_id: Optional[int] = None
    ip_cliente: Optional[str] = None
    user_agent: Optional[str] = None
    sesion_id: Optional[str] = None
    fecha_visto: datetime
    tiempo_visto_segundos: Optional[int] = None
    scroll_porcentaje: Optional[int] = 0
    archivos_descargados: Optional[List[int]] = []
    respuesta_pregunta: Optional[str] = None
    respuesta_boolean: Optional[bool] = None
    comentarios: Optional[str] = None
    activo: Optional[bool] = True
    
    class Config:
        from_attributes = True