from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.reporte import ReportePublicoResponse, CodigoAccesoValidar
from app.schemas.analisis import AnalisisReporteResponse
from app.services.reporte_service import ReporteService
from app.services.archivo_service import ArchivoService
from app.models.analisis_reporte import AnalisisReporte
from app.models.interaccion_cliente import InteraccionCliente
from app.models.user import User
from app.models.agency import Agency
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.archivo_reporte import ArchivoReporte
from app.models.task_evidence import TaskEvidence
from app.models.task import Task
import os

router = APIRouter()

@router.post("/public/reportes/{token}/validar")
def validar_acceso(
    token: str,
    datos: CodigoAccesoValidar,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Valida el código de acceso para un reporte público
    """
    print(f"🔍 Token recibido: {token}")
    print(f"🔍 Código recibido: {datos.codigo_acceso}")
    
    reporte = ReporteService.obtener_reporte_publico(token, datos.codigo_acceso, db)
    
    interaccion = InteraccionCliente(
        reporte_id=reporte.id,
        ip_cliente=request.client.host,
        user_agent=request.headers.get("user-agent"),
        sesion_id=request.headers.get("x-session-id")
    )
    db.add(interaccion)
    db.commit()
    
    return {
        "valido": True,
        "reporte_id": reporte.id,
        "mensaje": "Acceso validado correctamente"
    }


@router.get("/public/reportes/{token}", response_model=ReportePublicoResponse)
def obtener_reporte_publico(
    token: str,
    codigo_acceso: Optional[str] = Header(None, alias="X-Codigo-Acceso"),
    db: Session = Depends(get_db)
):
    """
    Obtiene un reporte público (requiere código de acceso en header)
    """
    if not codigo_acceso:
        raise HTTPException(
            status_code=401,
            detail="Se requiere el código de acceso en el header X-Codigo-Acceso"
        )
    
    print(f"🔍 Obteniendo reporte público - Token: {token}")
    
    # 1. Obtener el reporte
    reporte = ReporteService.obtener_reporte_publico(token, codigo_acceso, db)
    
    # 2. Obtener información del proyecto
    project = db.query(Project).filter(Project.id == reporte.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # 3. Obtener administrador
    admin = db.query(User).filter(User.id == reporte.admin_id).first()
    admin_name = admin.name if admin else None
    admin_email = admin.email if admin else None
    
    # 4. Obtener agencia
    agency = None
    agency_name = None
    agency_email = None
    agency_rfc = None
    if admin:
        agency = db.query(Agency).filter(Agency.id == admin.agency_id).first()
        if agency:
            agency_name = agency.name
            agency_email = agency.email
            agency_rfc = agency.rfc
    
    # 5. Contar empleados involucrados en el proyecto
    total_empleados = db.query(ProjectMember).filter(
        ProjectMember.project_id == reporte.project_id
    ).count()
    
    # 6. Obtener archivos del reporte
    archivos = ArchivoService.obtener_archivos_reporte(reporte.id, db)
    
    # 7. Obtener análisis
    analisis = db.query(AnalisisReporte).filter(
        AnalisisReporte.reporte_id == reporte.id,
        AnalisisReporte.activo == True
    ).all()
    
    # 8. Obtener evidencias seleccionadas (desde evidencias_ids)
    evidencias_tareas = []
    if reporte.evidencias_ids:
        for ev_id in reporte.evidencias_ids:
            evidencia = db.query(TaskEvidence).filter(TaskEvidence.id == ev_id).first()
            if evidencia:
                task = db.query(Task).filter(Task.id == evidencia.task_id).first()
                descripcion = getattr(evidencia, 'description', None) or evidencia.comment or ""
                evidencias_tareas.append({
                    "id": evidencia.id,
                    "tarea_nombre": task.title if task else "Sin tarea",
                    "descripcion": descripcion,
                    "archivo_nombre": evidencia.file_name or "Archivo adjunto",
                    "file_url": evidencia.file_url,
                    "fecha": evidencia.created_at.isoformat() if evidencia.created_at else None
                })
    
    # 9. Obtener archivos existentes seleccionados
    archivos_existentes = []
    if reporte.archivos_existentes_ids:
        for arch_id in reporte.archivos_existentes_ids:
            evidencia = db.query(TaskEvidence).filter(TaskEvidence.id == arch_id).first()
            if evidencia:
                task = db.query(Task).filter(Task.id == evidencia.task_id).first()
                descripcion = getattr(evidencia, 'description', None) or evidencia.comment or ""
                archivos_existentes.append({
                    "id": evidencia.id,
                    "nombre": evidencia.file_name or "Archivo",
                    "tarea_nombre": task.title if task else "Sin tarea",
                    "descripcion": descripcion,
                    "ruta": evidencia.file_url,
                    "tamaño": evidencia.file_size or 0,
                    "fecha": evidencia.created_at.isoformat() if evidencia.created_at else None
                })
    
    # 🔥 IMPORTANTE: Incluir el progreso del reporte
    progreso_reporte = reporte.progreso or 0
    print(f"📊 Progreso del reporte: {progreso_reporte}")
    
    return ReportePublicoResponse(
        # Información del reporte
        id=reporte.id,
        project_id=reporte.project_id,
        titulo=reporte.titulo,
        descripcion=reporte.descripcion,
        texto_avance=reporte.texto_avance,
        pregunta_cliente=reporte.pregunta_cliente,
        fecha_generacion=reporte.fecha_generacion,
        fecha_expiracion=reporte.fecha_expiracion,
        horas_expiracion=reporte.horas_expiracion or 24,
        
        # 🔥 PROGRESO DEL REPORTE (NUEVO)
        progreso=progreso_reporte,
        
        # Información del proyecto
        proyecto_nombre=project.name,
        proyecto_descripcion=project.description,
        proyecto_progress=project.progress or 0,
        proyecto_status=project.status,
        proyecto_budget=project.budget,
        proyecto_start_date=project.start_date,
        proyecto_end_date=project.end_date,
        
        # Admin y agencia
        admin_name=admin_name,
        admin_email=admin_email,
        agency_name=agency_name,
        agency_email=agency_email,
        agency_rfc=agency_rfc,
        
        # Empleados
        total_empleados=total_empleados,
        
        # Evidencias y archivos
        evidencias_tareas=evidencias_tareas,
        archivos_existentes=archivos_existentes,
        archivos=archivos,
        analisis=analisis
    )


@router.get("/public/reportes/{token}/archivos/{archivo_id}")
def descargar_archivo_publico(
    token: str,
    archivo_id: int,
    codigo_acceso: Optional[str] = Header(None, alias="X-Codigo-Acceso"),
    db: Session = Depends(get_db)
):
    """
    Descarga un archivo de un reporte público
    ✅ Soporta archivos subidos al reporte (ArchivoReporte)
    ✅ Soporta archivos de tareas (TaskEvidence)
    """
    if not codigo_acceso:
        raise HTTPException(
            status_code=401,
            detail="Se requiere el código de acceso en el header X-Codigo-Acceso"
        )
    
    # 1. Validar acceso al reporte
    reporte = ReporteService.obtener_reporte_publico(token, codigo_acceso, db)
    
    ruta_archivo = None
    nombre_original = None
    tipo_archivo = None
    es_archivo_reporte = False
    
    # 2. Buscar en ArchivoReporte (archivos subidos al reporte)
    archivo_reporte = db.query(ArchivoReporte).filter(
        ArchivoReporte.id == archivo_id,
        ArchivoReporte.reporte_id == reporte.id,
        ArchivoReporte.activo == True
    ).first()
    
    if archivo_reporte:
        ruta_archivo = archivo_reporte.ruta_archivo
        nombre_original = archivo_reporte.nombre_original
        tipo_archivo = archivo_reporte.tipo_archivo
        es_archivo_reporte = True
    else:
        # 3. Buscar en TaskEvidence (archivos de tareas)
        evidencia = db.query(TaskEvidence).filter(TaskEvidence.id == archivo_id).first()
        if evidencia:
            # Verificar que la evidencia pertenece a una tarea del proyecto del reporte
            task = db.query(Task).filter(Task.id == evidencia.task_id).first()
            if task and task.project_id == reporte.project_id:
                ruta_archivo = evidencia.file_url
                nombre_original = evidencia.file_name
                tipo_archivo = evidencia.file_type
    
    if not ruta_archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    # 4. Registrar la descarga en la interacción del cliente
    interaccion = db.query(InteraccionCliente).filter(
        InteraccionCliente.reporte_id == reporte.id
    ).order_by(InteraccionCliente.fecha_visto.desc()).first()
    
    if interaccion:
        descargas = interaccion.archivos_descargados or []
        if archivo_id not in descargas:
            descargas.append(archivo_id)
            interaccion.archivos_descargados = descargas
            db.commit()
    
    # 5. Determinar la ruta completa del archivo
    if ruta_archivo.startswith('/uploads/'):
        ruta_completa = '.' + ruta_archivo
    else:
        ruta_completa = ruta_archivo
    
    # 6. Verificar que el archivo existe físicamente
    if not os.path.exists(ruta_completa):
        if not os.path.exists(ruta_archivo):
            raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")
        ruta_completa = ruta_archivo
    
    # 7. Devolver el archivo
    return FileResponse(
        ruta_completa,
        filename=nombre_original or "archivo",
        media_type="application/octet-stream"
    )


# ✅ ENDPOINT CORREGIDO - Acepta JSON en el body
@router.post("/public/reportes/{token}/interactuar")
async def interactuar_cliente(
    token: str,
    request: Request,
    codigo_acceso: Optional[str] = Header(None, alias="X-Codigo-Acceso"),
    db: Session = Depends(get_db)
):
    """
    Registra la interacción del cliente con el reporte
    ✅ Acepta JSON en el body: { "respuesta_pregunta": "...", "comentarios": "..." }
    ✅ respuesta_pregunta acepta texto libre (no solo Sí/No)
    """
    # ✅ Leer el body como JSON
    try:
        data = await request.json()
    except Exception as e:
        print(f"❌ Error al leer JSON: {e}")
        raise HTTPException(status_code=400, detail="Se espera un body JSON válido")
    
    respuesta_pregunta = data.get('respuesta_pregunta')
    respuesta_boolean = data.get('respuesta_boolean')
    comentarios = data.get('comentarios')
    
    print(f"🔍 ===== INTERACCIÓN CLIENTE =====")
    print(f"📝 Token: {token}")
    print(f"📝 Código acceso: {codigo_acceso}")
    print(f"📝 respuesta_pregunta: {respuesta_pregunta}")
    print(f"📝 respuesta_boolean: {respuesta_boolean}")
    print(f"📝 comentarios: {comentarios}")
    
    if not codigo_acceso:
        raise HTTPException(
            status_code=401,
            detail="Se requiere el código de acceso en el header X-Codigo-Acceso"
        )
    
    print(f"🔍 Buscando reporte con token: {token}")
    reporte = ReporteService.obtener_reporte_publico(token, codigo_acceso, db)
    print(f"✅ Reporte encontrado: ID={reporte.id}, Título={reporte.titulo}")
    
    sesion_id = request.headers.get("x-session-id")
    print(f"📝 Sesion ID: {sesion_id}")
    print(f"📝 IP Cliente: {request.client.host}")
    
    # Buscar interacción existente
    interaccion = db.query(InteraccionCliente).filter(
        InteraccionCliente.reporte_id == reporte.id,
        InteraccionCliente.sesion_id == sesion_id
    ).order_by(InteraccionCliente.fecha_visto.desc()).first()
    
    if not interaccion:
        print(f"📝 Creando nueva interacción")
        interaccion = InteraccionCliente(
            reporte_id=reporte.id,
            ip_cliente=request.client.host,
            user_agent=request.headers.get("user-agent"),
            sesion_id=sesion_id
        )
        db.add(interaccion)
    else:
        print(f"📝 Actualizando interacción existente: ID={interaccion.id}")
    
    # ✅ Guardar la respuesta (texto libre)
    if respuesta_pregunta is not None and str(respuesta_pregunta).strip():
        interaccion.respuesta_pregunta = str(respuesta_pregunta).strip()
        print(f"✅ Respuesta guardada: '{interaccion.respuesta_pregunta}'")
    else:
        print(f"⚠️ respuesta_pregunta está vacío o es None: '{respuesta_pregunta}'")
    
    if respuesta_boolean is not None:
        interaccion.respuesta_boolean = bool(respuesta_boolean)
        print(f"✅ respuesta_boolean guardada: {interaccion.respuesta_boolean}")
    
    if comentarios is not None and str(comentarios).strip():
        interaccion.comentarios = str(comentarios).strip()
        print(f"✅ comentarios guardados: '{interaccion.comentarios}'")
    
    db.commit()
    print(f"✅ Interacción guardada con ID: {interaccion.id}")
    print(f"🔍 ===== FIN INTERACCIÓN =====\n")
    
    return {
        "message": "Interacción registrada exitosamente",
        "interaccion_id": interaccion.id,
        "respuesta_guardada": interaccion.respuesta_pregunta
    }