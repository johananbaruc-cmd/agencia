# app/services/reporte_service.py
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException

from app.models.reporte import ReporteProyecto
from app.models.project import Project
from app.models.user import User
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.metrica_proyecto import MetricaProyecto
from app.schemas.reporte import ReporteCreate, ReporteUpdate, ReportePublicar
from app.services.codigo_service import CodigoService
from app.services.qr_service import QRService
from app.services.archivo_service import ArchivoService
from app.services.analisis_service import AnalisisService  # 🔥 NUEVA IMPORTACIÓN


class ReporteService:
    """Servicio para gestionar reportes de proyectos"""
    
    @staticmethod
    def crear_reporte(
        datos: ReporteCreate,
        db: Session
    ) -> ReporteProyecto:
        """
        Crea un nuevo reporte en estado borrador
        🔥 EJECUTA ANÁLISIS AUTOMÁTICAMENTE
        """
        project = db.query(Project).filter(Project.id == datos.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        admin = db.query(User).filter(User.id == datos.admin_id).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Usuario admin no encontrado")
        
        codigo_acceso = CodigoService.generar_codigo_acceso()
        
        # ✅ Crear reporte con horas_expiracion
        reporte = ReporteProyecto(
            **datos.model_dump(),
            codigo_acceso=codigo_acceso,
            enlace_publico=None,
            codigo_qr=None,
            estado="borrador"
        )
        
        db.add(reporte)
        db.commit()
        db.refresh(reporte)
        
        # 🔥 EJECUTAR ANÁLISIS AUTOMÁTICAMENTE
        try:
            config_analisis = datos.configuracion_analisis or {}
            
            # Verificar que hay análisis seleccionados
            if any(config_analisis.values()):
                print(f"📊 Ejecutando análisis automáticos para reporte {reporte.id}")
                resultado = AnalisisService.ejecutar_analisis_seleccionados(
                    reporte.id, db
                )
                print(f"✅ Análisis ejecutados: {resultado.get('mensaje', 'OK')}")
            else:
                print(f"ℹ️ No hay análisis seleccionados para el reporte {reporte.id}")
                
        except Exception as e:
            # Si falla el análisis, NO BLOQUEA la creación del reporte
            print(f"⚠️ Error al ejecutar análisis automáticos: {e}")
            # Opcional: guardar el error en el reporte si tienes un campo para eso
            # reporte.error_analisis = str(e)
            db.commit()
        
        return reporte
    
    @staticmethod
    def obtener_reporte(
        reporte_id: int,
        db: Session,
        incluir_detalles: bool = False
    ) -> ReporteProyecto:
        query = db.query(ReporteProyecto).filter(
            ReporteProyecto.id == reporte_id,
            ReporteProyecto.activo == True
        )
        
        if incluir_detalles:
            query = query.options(
                joinedload(ReporteProyecto.archivos),
                joinedload(ReporteProyecto.analisis)
            )
        
        reporte = query.first()
        if not reporte:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")
        return reporte
    
    @staticmethod
    def obtener_reportes_proyecto(
        project_id: int,
        db: Session,
        skip: int = 0,
        limit: int = 100
    ) -> List[ReporteProyecto]:
        return db.query(ReporteProyecto).filter(
            ReporteProyecto.project_id == project_id,
            ReporteProyecto.activo == True
        ).order_by(
            ReporteProyecto.created_at.desc()
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def actualizar_reporte(
        reporte_id: int,
        datos: ReporteUpdate,
        db: Session
    ) -> ReporteProyecto:
        reporte = ReporteService.obtener_reporte(reporte_id, db)
        
        if reporte.estado == "publicado":
            raise HTTPException(
                status_code=400,
                detail="No se puede actualizar un reporte ya publicado"
            )
        
        for key, value in datos.model_dump(exclude_unset=True).items():
            setattr(reporte, key, value)
        
        db.commit()
        db.refresh(reporte)
        return reporte
    
    @staticmethod
    def publicar_reporte(
        reporte_id: int,
        datos: ReportePublicar,
        base_url: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Publica un reporte y genera enlaces de acceso
        ✅ La expiración se calcula con horas_expiracion
        """
        reporte = ReporteService.obtener_reporte(reporte_id, db)
        
        # Actualizar datos
        for key, value in datos.model_dump(exclude_unset=True).items():
            if key not in ['enviar_correo', 'correo_cliente']:
                setattr(reporte, key, value)
        
        # ✅ Usar horas_expiracion del reporte o el valor enviado
        horas = getattr(reporte, 'horas_expiracion', None) or datos.horas_expiracion or 24
        reporte.horas_expiracion = horas
        
        # ✅ Calcular fecha de expiración basada en horas
        reporte.fecha_expiracion = datetime.now() + timedelta(hours=horas)
        
        # Generar enlace público
        enlace = CodigoService.generar_enlace_publico(
            reporte.project_id,
            reporte.id
        )
        reporte.enlace_publico = enlace
        
        # Generar QR
        url_completa = QRService.generar_url_completa(base_url, enlace)
        codigo_qr = QRService.generar_qr(url_completa)
        reporte.codigo_qr = codigo_qr
        
        # Cambiar estado
        reporte.estado = "publicado"
        
        db.commit()
        db.refresh(reporte)
        
        return {
            "reporte": reporte,
            "codigo_acceso": reporte.codigo_acceso,
            "enlace_publico": reporte.enlace_publico,
            "codigo_qr": reporte.codigo_qr,
            "url_completa": url_completa,
            "horas_expiracion": horas,
            "fecha_expiracion": reporte.fecha_expiracion,
            "mensaje": f"Reporte publicado exitosamente. Código válido por {horas} horas"
        }
    
    @staticmethod
    def obtener_reporte_publico(
        token: str,
        codigo_acceso: str,
        db: Session
    ) -> ReporteProyecto:
        """
        Obtiene un reporte público validando el código de acceso
        ✅ Verifica expiración por horas
        """
        print(f"🔍 Buscando reporte con token: {token}")
        print(f"🔍 Buscando reporte con código: {codigo_acceso}")
        
        reporte = db.query(ReporteProyecto).filter(
            ReporteProyecto.enlace_publico == token,
            ReporteProyecto.codigo_acceso == codigo_acceso,
            ReporteProyecto.estado == "publicado",
            ReporteProyecto.activo == True
        ).first()
        
        if not reporte:
            print(f"❌ Reporte NO encontrado para token: {token}")
            raise HTTPException(
                status_code=404,
                detail="Reporte no encontrado o código incorrecto"
            )
        
        print(f"✅ Reporte encontrado: ID {reporte.id}, Título: {reporte.titulo}")
        
        # ✅ Verificar expiración por horas
        if reporte.fecha_expiracion and reporte.fecha_expiracion < datetime.now():
            horas_restantes = (reporte.fecha_expiracion - datetime.now()).total_seconds() / 3600
            print(f"⏰ Reporte expirado. Expiró hace {abs(horas_restantes):.1f} horas")
            raise HTTPException(
                status_code=410,
                detail=f"El reporte ha expirado. Fue válido por {reporte.horas_expiracion or 24} horas"
            )
        
        # Incrementar contador de visitas
        reporte.veces_visto += 1
        db.commit()
        
        return reporte
    
    @staticmethod
    def eliminar_reporte(
        reporte_id: int,
        db: Session
    ) -> bool:
        reporte = ReporteService.obtener_reporte(reporte_id, db)
        
        if reporte.estado == "publicado":
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar un reporte publicado"
            )
        
        reporte.activo = False
        db.commit()
        return True
    
    @staticmethod
    def obtener_resumen_proyecto(
        project_id: int,
        db: Session
    ) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        total_empleados = db.query(func.count(ProjectMember.id)).filter(
            ProjectMember.project_id == project_id
        ).scalar() or 0
        
        total_tareas = db.query(func.count(Task.id)).filter(
            Task.project_id == project_id
        ).scalar() or 0
        
        return {
            "nombre": project.name,
            "descripcion": project.description,
            "status": project.status,
            "progress": project.progress,
            "budget": project.budget,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "total_empleados": total_empleados,
            "tareas_completadas": 0,
            "tareas_pendientes": total_tareas
        }
    
    @staticmethod
    def renovar_expiracion(
        reporte_id: int,
        horas: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Renueva la fecha de expiración de un reporte público
        """
        reporte = ReporteService.obtener_reporte(reporte_id, db)
        
        if reporte.estado != "publicado":
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden renovar reportes publicados"
            )
        
        reporte.horas_expiracion = horas
        reporte.fecha_expiracion = datetime.now() + timedelta(hours=horas)
        
        db.commit()
        db.refresh(reporte)
        
        return {
            "reporte": reporte,
            "mensaje": f"Expiración renovada. Código válido por {horas} horas adicionales"
        }