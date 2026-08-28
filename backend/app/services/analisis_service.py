# app/services/analisis_service.py

import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, date as date_type
from collections import Counter, defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
import time
from app.models.analisis import AnalisisDashboard
from app.models.project import Project
from app.models.task import Task
from app.models.task_evidence import TaskEvidence
from app.models.user import User
from app.models.client import Client
from app.models.agency import Agency


# ============================================
# CONFIGURACIÓN
# ============================================
HORAS_POR_DIA_LABORAL = 8.0
TOPE_DIAS_HABILES_POR_TAREA = 60
MAX_ESTADOS_PASTEL = 6


class AnalisisService:
    """
    Servicio para calcular y almacenar datos del dashboard de análisis
    """

    @staticmethod
    def calcular_dashboard(
        db: Session,
        agencia_id: Optional[int] = None
    ) -> AnalisisDashboard:
        """
        Calcula todos los datos del dashboard y los almacena en la BD
        """
        start_time = time.time()

        # Desactivar datos anteriores
        query = db.query(AnalisisDashboard).filter(AnalisisDashboard.es_actual == True)
        if agencia_id:
            query = query.filter(AnalisisDashboard.agencia_id == agencia_id)
        query.update({"es_actual": False})
        db.commit()

        # Calcular horas estimadas desde evidencias aprobadas
        horas_estimadas = AnalisisService._calcular_horas_desde_evidencias(db, agencia_id)

        # KPIs
        kpis = AnalisisService._calcular_kpis(db, agencia_id, horas_estimadas)

        # Datos para gráficas
        proyectos_estado = AnalisisService._calcular_proyectos_estado(db, agencia_id)
        tareas_prioridad = AnalisisService._calcular_tareas_prioridad(db, agencia_id)
        tareas_proyecto = AnalisisService._calcular_tareas_proyecto(db, agencia_id)
        horas_diarias = AnalisisService._calcular_horas_diarias(horas_estimadas)
        prediccion_horas = AnalisisService._calcular_prediccion_horas(horas_estimadas)
        carga_empleados = AnalisisService._calcular_carga_empleados(db, agencia_id)
        proyectos_riesgo = AnalisisService._calcular_proyectos_riesgo(db, agencia_id)
        top_clientes = AnalisisService._calcular_top_clientes(db, agencia_id)
        clientes_industria = AnalisisService._calcular_clientes_industria(db, agencia_id)

        # Crear registro
        dashboard = AnalisisDashboard(
            total_proyectos=kpis["total_proyectos"],
            total_empleados=kpis["total_empleados"],
            total_clientes=kpis["total_clientes"],
            tareas_pendientes=kpis["tareas_pendientes"],
            tareas_completadas=kpis["tareas_completadas"],
            proyectos_activos=kpis["proyectos_activos"],
            horas_totales=kpis["horas_totales"],
            proyectos_por_estado=proyectos_estado,
            tareas_por_prioridad=tareas_prioridad,
            tareas_por_proyecto=tareas_proyecto,
            horas_diarias=horas_diarias,
            prediccion_horas=prediccion_horas,
            carga_empleados=carga_empleados,
            proyectos_riesgo=proyectos_riesgo,
            top_clientes=top_clientes,
            clientes_industria=clientes_industria,
            eficiencia_proyectos=[],
            agencia_id=agencia_id,
            es_actual=True,
            tiempo_calculo_ms=int((time.time() - start_time) * 1000),
        )

        db.add(dashboard)
        db.commit()
        db.refresh(dashboard)

        return dashboard

    # ============================================
    # 1. CÁLCULO DE HORAS DESDE EVIDENCIAS APROBADAS
    # ============================================
    @staticmethod
    def _calcular_horas_desde_evidencias(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        """
        Calcula horas estimadas a partir de evidencias aprobadas.
        Cuenta días hábiles (lunes a viernes) desde creación de tarea hasta entrega.
        8 horas por día hábil.
        """
        query = (
            db.query(
                Task.id.label("task_id"),
                Task.created_at,
                TaskEvidence.delivery_date,
                TaskEvidence.reviewed_at,
                TaskEvidence.created_at.label("evidencia_creada"),
                TaskEvidence.status,
            )
            .join(TaskEvidence, TaskEvidence.task_id == Task.id)
            .filter(func.lower(TaskEvidence.status) == "approved")
        )

        if agencia_id:
            query = query.join(Project, Project.id == Task.project_id).filter(
                Project.agency_id == agencia_id
            )

        resultados = query.all()

        print(f"🔍 Evidencias aprobadas encontradas: {len(resultados)}")

        if len(resultados) == 0:
            print("⚠️ No se encontraron evidencias aprobadas. Verifica:")
            print("   1. El status en task_evidence es 'approved' (case sensitive)")
            print("   2. La tarea tiene un project_id válido")
            print("   3. El agency_id coincide con el filtro")

        filas = []
        for r in resultados:
            # Priorizar evidencia_creada como fecha de entrega
            fecha_fin = r.evidencia_creada or r.delivery_date or r.reviewed_at
            fecha_inicio = r.created_at

            if not fecha_inicio or not fecha_fin:
                print(f"⚠️ Tarea {r.task_id}: sin fecha de inicio o fin")
                continue

            dias_habiles = AnalisisService._contar_dias_habiles(fecha_inicio, fecha_fin)

            if dias_habiles <= 0:
                print(f"⚠️ Tarea {r.task_id}: {dias_habiles} días hábiles (misma fecha)")
                # Si es el mismo día, al menos contar 1 hora
                if fecha_inicio.date() == fecha_fin.date():
                    filas.append({
                        "fecha": fecha_inicio.date(),
                        "horas": 1.0,
                        "task_id": r.task_id
                    })
                    print(f"   → Asignando 1 hora por tarea del mismo día")
                continue

            if dias_habiles > TOPE_DIAS_HABILES_POR_TAREA:
                dias_habiles = TOPE_DIAS_HABILES_POR_TAREA

            horas = dias_habiles * HORAS_POR_DIA_LABORAL

            fechas = AnalisisService._obtener_fechas_habiles(fecha_inicio, fecha_fin)
            for fecha in fechas[:TOPE_DIAS_HABILES_POR_TAREA]:
                filas.append({
                    "fecha": fecha,
                    "horas": HORAS_POR_DIA_LABORAL,
                    "task_id": r.task_id
                })

            print(f"✅ Tarea {r.task_id}: {dias_habiles} días hábiles → {horas} horas")
            print(f"   Fecha inicio: {fecha_inicio}, Fecha fin: {fecha_fin}")

        print(f"📊 Total filas generadas: {len(filas)}")
        return filas

    @staticmethod
    def _contar_dias_habiles(inicio, fin) -> int:
        """Cuenta días hábiles (lunes a viernes) entre dos fechas"""
        if not inicio or not fin:
            return 0

        if hasattr(inicio, "date"):
            inicio = inicio.date()
        if hasattr(fin, "date"):
            fin = fin.date()

        if fin < inicio:
            inicio, fin = fin, inicio

        dias = 0
        actual = inicio
        while actual <= fin:
            if actual.weekday() < 5:
                dias += 1
            actual += timedelta(days=1)

        return dias

    @staticmethod
    def _obtener_fechas_habiles(inicio, fin) -> List[date_type]:
        """Devuelve lista de días hábiles entre dos fechas"""
        if not inicio or not fin:
            return []

        if hasattr(inicio, "date"):
            inicio = inicio.date()
        if hasattr(fin, "date"):
            fin = fin.date()

        if fin < inicio:
            inicio, fin = fin, inicio

        fechas = []
        actual = inicio
        while actual <= fin:
            if actual.weekday() < 5:
                fechas.append(actual)
            actual += timedelta(days=1)

        return fechas

    # ============================================
    # 2. PROYECTOS POR ESTADO (CON AGRUPACIÓN "OTROS")
    # ============================================
    @staticmethod
    def _calcular_proyectos_estado(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        """
        Calcula distribución de proyectos por estado.
        Si hay más de MAX_ESTADOS_PASTEL, agrupa el resto en "Otros".
        """
        query = db.query(Project.status)
        if agencia_id:
            query = query.filter(Project.agency_id == agencia_id)

        valores = [(s or "sin_estado").strip() for (s,) in query.all()]
        conteo = Counter(v.lower() for v in valores)

        # Función para limpiar nombres de estados
        def limpiar_nombre_estado(status: str) -> str:
            if not status:
                return "Sin estado"

            # Eliminar números al final (ej: _1787850409455)
            status_limpio = re.sub(r'_\d+$', '', status)
            # Reemplazar guiones bajos por espacios
            status_limpio = status_limpio.replace('_', ' ')
            # Capitalizar
            status_limpio = status_limpio.title()

            mapping = {
                'Pending': 'Pendiente',
                'In Progress': 'En Progreso',
                'Completed': 'Completado',
                'Active': 'Activo',
                'On Hold': 'En Espera',
                'Cancelled': 'Cancelado',
                'En Espera De Presupuesto': 'En Espera de Presupuesto',
            }
            return mapping.get(status_limpio, status_limpio)

        # Construir lista de estados con nombres limpios
        estados = []
        for clave, total in conteo.items():
            texto_original = None
            for v in valores:
                if v.lower() == clave:
                    texto_original = v
                    break

            nombre_limpio = limpiar_nombre_estado(texto_original or clave)
            estados.append({"name": nombre_limpio, "value": total, "_key": clave})

        # Ordenar por valor descendente
        estados.sort(key=lambda x: x["value"], reverse=True)

        # Si hay más de MAX_ESTADOS_PASTEL, agrupar el resto en "Otros"
        if len(estados) > MAX_ESTADOS_PASTEL:
            top = estados[:MAX_ESTADOS_PASTEL]
            otros = estados[MAX_ESTADOS_PASTEL:]
            suma_otros = sum(item["value"] for item in otros)

            resultado = top
            if suma_otros > 0:
                resultado.append({"name": "Otros", "value": suma_otros, "_key": "otros"})
            return resultado

        return estados

    # ============================================
    # 3. KPIs
    # ============================================
    @staticmethod
    def _calcular_kpis(db: Session, agencia_id: Optional[int], horas_estimadas: List[Dict]) -> Dict[str, Any]:
        """Calcula todos los KPIs"""
        query_projects = db.query(Project)
        if agencia_id:
            query_projects = query_projects.filter(Project.agency_id == agencia_id)

        total_proyectos = query_projects.count()
        proyectos_activos = query_projects.filter(
            func.lower(func.coalesce(Project.status, "")).in_(["active", "in_progress", "en desarrollo"])
        ).count()

        query_users = db.query(User).filter(User.role == "employee")
        if agencia_id:
            query_users = query_users.filter(User.agency_id == agencia_id)
        total_empleados = query_users.count()

        query_clients = db.query(Client).filter(Client.is_active == True)
        if agencia_id:
            query_clients = query_clients.filter(Client.agency_id == agencia_id)
        total_clientes = query_clients.count()

        query_tasks = db.query(Task)
        if agencia_id:
            query_tasks = query_tasks.join(Project).filter(Project.agency_id == agencia_id)

        tareas_pendientes = query_tasks.filter(Task.status == "pending").count()
        tareas_completadas = query_tasks.filter(Task.status == "completed").count()

        horas_totales = sum(f["horas"] for f in horas_estimadas)

        return {
            "total_proyectos": total_proyectos,
            "total_empleados": total_empleados,
            "total_clientes": total_clientes,
            "tareas_pendientes": tareas_pendientes,
            "tareas_completadas": tareas_completadas,
            "proyectos_activos": proyectos_activos,
            "horas_totales": int(round(horas_totales)),
        }

    # ============================================
    # 4. TAREAS POR PRIORIDAD
    # ============================================
    @staticmethod
    def _calcular_tareas_prioridad(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        query = db.query(Task.priority, func.count(Task.id).label("count"))
        if agencia_id:
            query = query.join(Project).filter(Project.agency_id == agencia_id)
        query = query.group_by(Task.priority)

        resultados = query.all()
        orden = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        resultados_ordenados = sorted(
            resultados, key=lambda r: orden.get(str(r.priority or "").lower(), 99)
        )
        return [{"name": str(r.priority) or "sin_prioridad", "value": r.count} for r in resultados_ordenados]

    # ============================================
    # 5. TAREAS POR PROYECTO
    # ============================================
    @staticmethod
    def _calcular_tareas_proyecto(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        query = (
            db.query(
                Project.name,
                func.sum(case((Task.status == "completed", 1), else_=0)).label("completadas"),
                func.sum(case((Task.status == "in_progress", 1), else_=0)).label("en_progreso"),
                func.sum(case((Task.status == "pending", 1), else_=0)).label("pendientes"),
                func.count(Task.id).label("total"),
            )
            .join(Task, Task.project_id == Project.id)
            .group_by(Project.id, Project.name)
        )

        if agencia_id:
            query = query.filter(Project.agency_id == agencia_id)

        query = query.order_by(desc("total")).limit(8)
        resultados = query.all()

        return [
            {
                "name": r.name,
                "completadas": r.completadas or 0,
                "enProgreso": r.en_progreso or 0,
                "pendientes": r.pendientes or 0,
            }
            for r in resultados
        ]

    # ============================================
    # 6. HORAS DIARIAS
    # ============================================
    @staticmethod
    def _calcular_horas_diarias(horas_estimadas: List[Dict]) -> List[Dict]:
        fecha_limite = datetime.now().date() - timedelta(days=30)
        agrupado = defaultdict(float)
        for f in horas_estimadas:
            if f["fecha"] >= fecha_limite:
                agrupado[f["fecha"]] += f["horas"]

        return [
            {"fecha": fecha.strftime("%d/%m"), "horas": round(horas, 1)}
            for fecha, horas in sorted(agrupado.items())
        ]

    # ============================================
    # 7. PREDICCIÓN DE HORAS
    # ============================================
    @staticmethod
    def _calcular_prediccion_horas(horas_estimadas: List[Dict]) -> List[Dict]:
        try:
            import pandas as pd
            from sklearn.linear_model import LinearRegression

            fecha_limite = datetime.now().date() - timedelta(days=60)
            agrupado = defaultdict(float)
            for f in horas_estimadas:
                if f["fecha"] >= fecha_limite:
                    agrupado[f["fecha"]] += f["horas"]

            if len(agrupado) < 3:
                return []

            df = pd.DataFrame(
                [{"fecha": fecha, "horas": horas} for fecha, horas in sorted(agrupado.items())]
            )
            df["dia"] = range(len(df))

            X = df[["dia"]].values
            y = df["horas"].values

            model = LinearRegression()
            model.fit(X, y)

            y_ajustado = model.predict(X)

            puntos = [
                {
                    "fecha": row["fecha"].strftime("%d/%m"),
                    "horas": round(row["horas"], 1),
                    "regresion": round(max(float(y_ajustado[i]), 0), 1),
                    "tipo": "real",
                }
                for i, row in df.iterrows()
            ]

            ultimo_dia = int(df["dia"].max())
            ultima_fecha = df["fecha"].max()
            dias_futuros = [[ultimo_dia + i] for i in range(1, 31)]
            y_futuro = model.predict(dias_futuros)

            for i in range(30):
                fecha_futura = ultima_fecha + timedelta(days=i + 1)
                puntos.append({
                    "fecha": fecha_futura.strftime("%d/%m"),
                    "horas": None,
                    "regresion": round(max(float(y_futuro[i]), 0), 1),
                    "tipo": "prediccion",
                })

            return puntos

        except Exception as e:
            print(f"Error en predicción de horas: {e}")
            return []

    # ============================================
    # 8. CARGA DE EMPLEADOS (MODIFICADA PARA EVIDENCIAS)
    # ============================================
    @staticmethod
    def _calcular_carga_empleados(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        """Calcula carga de trabajo por empleado, incluyendo evidencias aprobadas/rechazadas y proyectos activos"""
        
        # 1. Obtener conteo de tareas y evidencias por empleado
        query = (
            db.query(
                User.id,
                User.name,
                # Tareas por estado
                func.count(Task.id).filter(Task.status == "pending").label("pendientes"),
                func.count(Task.id).filter(Task.status == "in_progress").label("en_progreso"),
                func.count(Task.id).filter(Task.status == "completed").label("completadas"),
                # Evidencias aprobadas
                func.sum(
                    case(
                        (func.lower(TaskEvidence.status) == "approved", 1),
                        else_=0
                    )
                ).label("aprobadas"),
                # Evidencias rechazadas
                func.sum(
                    case(
                        (func.lower(TaskEvidence.status) == "rejected", 1),
                        else_=0
                    )
                ).label("rechazadas"),
                # Proyectos activos (distintos)
                func.count(func.distinct(Project.id)).filter(
                    Project.status.in_(['active', 'in_progress', 'pending'])
                ).label("proyectos_activos")
            )
            .outerjoin(Task, Task.assigned_to == User.id)
            .outerjoin(Project, Project.id == Task.project_id)
            .outerjoin(TaskEvidence, TaskEvidence.task_id == Task.id)
            .filter(User.role == "employee")
            .group_by(User.id, User.name)
        )

        if agencia_id:
            query = query.filter(User.agency_id == agencia_id)

        resultados = query.all()

        # 2. Construir la lista de salida
        salida = []
        for r in resultados:
            # Calcular total de tareas asignadas (todas)
            total_tareas = (r.pendientes or 0) + (r.en_progreso or 0) + (r.completadas or 0)
            
            # Calcular eficiencia basada en evidencias aprobadas vs total evidencias
            total_evidencias = (r.aprobadas or 0) + (r.rechazadas or 0)
            eficiencia = int(
                ((r.aprobadas or 0) / total_evidencias) * 100
            ) if total_evidencias > 0 else 0

            salida.append({
                "name": r.name,
                "pendientes": r.pendientes or 0,
                "enProgreso": r.en_progreso or 0,
                "completadas": r.completadas or 0,
                "aprobadas": r.aprobadas or 0,
                "rechazadas": r.rechazadas or 0,
                "proyectosActivos": r.proyectos_activos or 0,
                "eficiencia": eficiencia,
            })

        # 3. Ordenar por evidencias aprobadas (de mayor a menor) para el Top 3
        salida.sort(key=lambda x: x["aprobadas"], reverse=True)

        return salida

    # ============================================
    # 9. PROYECTOS EN RIESGO
    # ============================================
    @staticmethod
    def _calcular_proyectos_riesgo(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        hoy = datetime.now().date()

        query = db.query(
            Project.id,
            Project.name,
            Project.end_date,
            Project.progress
        ).filter(
            Project.end_date.isnot(None),
            Project.status.in_(['active', 'in_progress', 'pending', 'on_hold'])
        )

        if agencia_id:
            query = query.filter(Project.agency_id == agencia_id)

        resultados = query.all()

        salida = []
        for r in resultados:
            if not r.end_date:
                continue
            dias_restantes = (r.end_date.date() - hoy).days
            progreso = r.progress or 0

            if dias_restantes < 0:
                riesgo = "critical"
            elif dias_restantes < 7 and progreso < 80:
                riesgo = "critical"
            elif dias_restantes < 14 and progreso < 60:
                riesgo = "warning"
            else:
                riesgo = "safe"

            salida.append({
                "name": r.name,
                "progreso": min(progreso, 100),
                "diasRestantes": dias_restantes,
                "riesgo": riesgo,
            })

        return salida

    # ============================================
    # 10. TOP CLIENTES
    # ============================================
    @staticmethod
    def _calcular_top_clientes(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        query = (
            db.query(Client.name, func.sum(Project.budget).label("presupuesto"))
            .join(Project, Project.client_id == Client.id)
            .group_by(Client.id, Client.name)
            .order_by(func.sum(Project.budget).desc())
            .limit(10)
        )

        if agencia_id:
            query = query.filter(Project.agency_id == agencia_id)

        resultados = query.all()

        return [{"name": r.name, "presupuesto": r.presupuesto or 0} for r in resultados]

    # ============================================
    # 11. CLIENTES POR EMPRESA
    # ============================================
    @staticmethod
    def _calcular_clientes_industria(db: Session, agencia_id: Optional[int]) -> List[Dict]:
        query = db.query(
            Client.company,
            func.count(Client.id).label('value')
        ).filter(Client.company.isnot(None))

        if agencia_id:
            query = query.filter(Client.agency_id == agencia_id)

        query = query.group_by(Client.company)
        resultados = query.all()

        items = [{"name": r.company or "Sin empresa", "value": r.value} for r in resultados]
        return AnalisisService._agrupar_top_n(items, n=6)

    @staticmethod
    def _agrupar_top_n(items: List[Dict], n: int = 6, key: str = "value") -> List[Dict]:
        """Agrupa el top N y el resto en 'Otros'"""
        if len(items) <= n:
            return items
        ordenados = sorted(items, key=lambda x: x[key], reverse=True)
        top = ordenados[:n]
        resto = ordenados[n:]
        suma_resto = sum(i[key] for i in resto)
        if suma_resto > 0:
            top.append({"name": "Otros", key: suma_resto})
        return top

    # ============================================
    # 12. MÉTODOS PARA OBTENER DATOS
    # ============================================
    @staticmethod
    def obtener_dashboard_actual(
        db: Session,
        agencia_id: Optional[int] = None
    ) -> Optional[AnalisisDashboard]:
        query = db.query(AnalisisDashboard).filter(AnalisisDashboard.es_actual == True)
        if agencia_id:
            query = query.filter(AnalisisDashboard.agencia_id == agencia_id)
        return query.first()

    @staticmethod
    def obtener_o_calcular_dashboard(
        db: Session,
        agencia_id: Optional[int] = None
    ) -> AnalisisDashboard:
        dashboard = AnalisisService.obtener_dashboard_actual(db, agencia_id)
        if not dashboard:
            dashboard = AnalisisService.calcular_dashboard(db, agencia_id)
        return dashboard

    @staticmethod
    def actualizar_dashboard(
        db: Session,
        agencia_id: Optional[int] = None
    ) -> AnalisisDashboard:
        return AnalisisService.calcular_dashboard(db, agencia_id)