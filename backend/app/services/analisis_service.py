# app/services/analisis_service.py

import time
import json
import math
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.reporte import ReporteProyecto
from app.models.analisis_reporte import AnalisisReporte
from app.models.project import Project
from app.models.task import Task
from app.models.time_entry import TimeEntry
from app.models.project_member import ProjectMember
from app.models.user import User


class AnalisisService:
    
    # ============================================
    # CONFIGURACIÓN
    # ============================================
    MIN_TAREAS_REGISTROS = 3
    
    # ============================================
    # 1. EJECUTAR ANÁLISIS (PRINCIPAL)
    # ============================================
    @staticmethod
    def ejecutar_analisis(
        reporte_id: int,
        configuracion: Dict[str, Any],
        db: Session
    ) -> AnalisisReporte:
        """
        Ejecuta un análisis de datos y guarda los resultados
        """
        # 1. Obtener el reporte
        reporte = db.query(ReporteProyecto).filter(
            ReporteProyecto.id == reporte_id,
            ReporteProyecto.activo == True
        ).first()
        
        if not reporte:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")
        
        # 2. Obtener el proyecto
        project = db.query(Project).filter(
            Project.id == reporte.project_id
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        # 3. Obtener datos del proyecto (HÍBRIDO: BD + Python)
        datos = AnalisisService._obtener_datos_proyecto_hibrido(project.id, db, reporte)
        
        if not datos or len(datos) < AnalisisService.MIN_TAREAS_REGISTROS:
            raise HTTPException(
                status_code=400,
                detail=f"No hay suficientes datos para el análisis. Mínimo: {AnalisisService.MIN_TAREAS_REGISTROS} tareas"
            )
        
        # 4. Iniciar temporizador
        start_time = time.time()
        
        # 5. Ejecutar el análisis según el tipo
        tipo = configuracion.get('tipo_analisis')
        
        analisis_map = {
            'pca': AnalisisService._ejecutar_pca,
            'regresion': AnalisisService._ejecutar_regresion,
            'regresion_gasto_tiempo': AnalisisService._ejecutar_regresion_gasto_tiempo,
            'regresion_rendimiento_empleado': AnalisisService._ejecutar_regresion_rendimiento_empleado,
            'regresion_presupuesto_plazo': AnalisisService._ejecutar_regresion_presupuesto_plazo,
            'clustering': AnalisisService._ejecutar_clustering,
            'curva_s': AnalisisService._ejecutar_curva_s,
            'desviacion_plazos': AnalisisService._ejecutar_desviacion_plazos,
            'estadisticas': AnalisisService._ejecutar_estadisticas,
            'prediccion_fin': AnalisisService._ejecutar_prediccion_fin
        }
        
        if tipo not in analisis_map:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de análisis no soportado: {tipo}"
            )
        
        resultados = analisis_map[tipo](datos, configuracion, reporte, project, db)
        
        # 6. Calcular tiempo de ejecución
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        # 7. Crear el registro
        nombre = configuracion.get('nombre') or f"Análisis {tipo}"
        descripcion = configuracion.get('descripcion') or f"Análisis de tipo {tipo}"
        
        analisis = AnalisisReporte(
            reporte_id=reporte_id,
            tipo_analisis=tipo,
            nombre=nombre,
            descripcion=descripcion,
            configuracion=configuracion,
            metadata_analisis={
                'version_algoritmo': configuracion.get('version', '2.0.0'),
                'fecha_datos': datetime.now().isoformat()
            },
            resultados=resultados.get('resultados'),
            datos_grafica=resultados.get('datos_grafica'),
            grafica_principal=resultados.get('grafica_principal'),
            graficas_adicionales=resultados.get('graficas_adicionales'),
            nivel_riesgo=resultados.get('nivel_riesgo'),
            nivel_confianza=resultados.get('nivel_confianza'),
            recomendaciones=resultados.get('recomendaciones', []),
            alertas=resultados.get('alertas', []),
            empleado_analizado=resultados.get('empleado_analizado'),
            variable_dependiente=resultados.get('variable_dependiente'),
            variables_independientes=resultados.get('variables_independientes', []),
            proyecto_id_externo=project.external_id if hasattr(project, 'external_id') else None,
            tiempo_ejecucion_ms=elapsed_ms,
            version_algoritmo=configuracion.get('version', '2.0.0'),
            activo=True
        )
        
        db.add(analisis)
        db.commit()
        db.refresh(analisis)
        
        return analisis
    
    # ============================================
    # 2. OBTENER DATOS (HÍBRIDO: BD + Python)
    # ============================================
    @staticmethod
    def _obtener_datos_proyecto_hibrido(
        project_id: int,
        db: Session,
        reporte: Optional[ReporteProyecto] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene datos del proyecto usando SQL optimizado (BD) + procesamiento en Python
        """
        # ==========================================
        # 2a. CONSULTAS SQL OPTIMIZADAS (BD)
        # ==========================================
        
        # 1. Obtener proyecto
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return []
        
        # 2. Obtener tareas (con join para evitar N+1)
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        
        # 3. Obtener time entries (agregados por tarea usando SQL)
        time_agg = db.query(
            TimeEntry.task_id,
            func.sum(TimeEntry.hours).label('total_hours'),
            func.count(TimeEntry.id).label('entry_count')
        ).filter(
            TimeEntry.project_id == project_id
        ).group_by(TimeEntry.task_id).all()
        
        time_by_task = {t.task_id: {'hours': t.total_hours or 0, 'count': t.entry_count or 0} 
                       for t in time_agg}
        
        # 4. Obtener empleados
        user_ids = list(set([t.assigned_to for t in tasks if t.assigned_to]))
        users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
        user_map = {u.id: u for u in users}
        
        # ==========================================
        # 2b. PROCESAMIENTO EN PYTHON
        # ==========================================
        
        # Datos del proyecto
        presupuesto_total = project.budget or 0
        presupuesto_gastado = reporte.presupuesto_gastado if reporte else 0
        progreso_proyecto = reporte.progreso if reporte else (project.progress or 0)
        
        fecha_inicio = reporte.fecha_inicio if reporte else project.start_date
        fecha_fin_planeada = reporte.fecha_fin_planeada if reporte else project.end_date
        
        now = datetime.now()
        dias_totales_proyecto = 0
        dias_transcurridos = 0
        
        if fecha_inicio and fecha_fin_planeada:
            if isinstance(fecha_inicio, datetime):
                fecha_inicio_dt = fecha_inicio
            else:
                fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
            if isinstance(fecha_fin_planeada, datetime):
                fecha_fin_dt = fecha_fin_planeada
            else:
                fecha_fin_dt = datetime.combine(fecha_fin_planeada, datetime.min.time())
            dias_totales_proyecto = (fecha_fin_dt - fecha_inicio_dt).days
        
        if fecha_inicio:
            if isinstance(fecha_inicio, datetime):
                fecha_inicio_dt = fecha_inicio
            else:
                fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
            dias_transcurridos = (now - fecha_inicio_dt).days
        
        # Procesar tareas
        datos = []
        total_hours = sum([t['hours'] for t in time_by_task.values()]) or 1
        total_tasks = len(tasks)
        costo_por_hora = presupuesto_total / total_hours if total_hours > 0 else 0
        
        for task in tasks:
            horas_totales = time_by_task.get(task.id, {}).get('hours', 0) or 0
            
            progreso_tarea = AnalisisService._calcular_progreso_desde_status(task.status)
            
            dias_hasta_entrega = None
            if task.due_date:
                if isinstance(task.due_date, datetime):
                    fecha_vencimiento = task.due_date
                else:
                    fecha_vencimiento = datetime.combine(task.due_date, datetime.min.time())
                dias_hasta_entrega = (fecha_vencimiento - now).days
            
            dias_desde_inicio = None
            if task.created_at:
                if isinstance(task.created_at, datetime):
                    fecha_creacion = task.created_at
                else:
                    fecha_creacion = datetime.combine(task.created_at, datetime.min.time())
                dias_desde_inicio = (now - fecha_creacion).days
            
            empleado_nombre = None
            empleado_rol = None
            if task.assigned_to and task.assigned_to in user_map:
                empleado_nombre = user_map[task.assigned_to].name
                empleado_rol = user_map[task.assigned_to].role
            
            costo_tarea = horas_totales * costo_por_hora
            porcentaje_presupuesto = (costo_tarea / presupuesto_total * 100) if presupuesto_total > 0 else 0
            eficiencia = progreso_tarea / (costo_tarea + 1) if costo_tarea > 0 else 0
            productividad = progreso_tarea / (horas_totales + 1) if horas_totales > 0 else 0
            
            datos.append({
                'task_id': task.id,
                'task_name': task.title,
                'status': task.status,
                'priority': task.priority,
                'progress': progreso_tarea,
                'empleado': empleado_nombre,
                'empleado_rol': empleado_rol,
                'assigned_to': task.assigned_to,
                'hours_spent': horas_totales,
                'dias_desde_inicio': dias_desde_inicio,
                'dias_hasta_entrega': dias_hasta_entrega,
                'dias_totales_proyecto': dias_totales_proyecto,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'presupuesto_total': presupuesto_total,
                'presupuesto_gastado': presupuesto_gastado,
                'presupuesto_restante': presupuesto_total - presupuesto_gastado,
                'costo_por_hora': round(costo_por_hora, 2),
                'costo_tarea': round(costo_tarea, 2),
                'porcentaje_presupuesto': round(porcentaje_presupuesto, 2),
                'eficiencia': round(eficiencia, 4),
                'productividad': round(productividad, 4),
                'total_hours': total_hours,
                'total_tasks': total_tasks,
                'progreso_proyecto': progreso_proyecto,
                'dias_transcurridos': dias_transcurridos,
                'is_completed': task.status and task.status.upper() == 'COMPLETED',
                'is_overdue': dias_hasta_entrega is not None and dias_hasta_entrega < 0 if task.status and task.status.upper() != 'COMPLETED' else False,
                'dias_retraso': abs(dias_hasta_entrega) if dias_hasta_entrega is not None and dias_hasta_entrega < 0 else 0,
                'fecha_inicio_proyecto': fecha_inicio.isoformat() if fecha_inicio else None,
                'fecha_fin_planeada': fecha_fin_planeada.isoformat() if fecha_fin_planeada else None,
            })
        
        return datos
    
    # ============================================
    # 3. FUNCIÓN AUXILIAR: PROGRESO DESDE STATUS
    # ============================================
    @staticmethod
    def _calcular_progreso_desde_status(status: str) -> float:
        if not status:
            return 0
        
        status_upper = status.upper().strip()
        
        STATUS_PROGRESS_MAP = {
            'COMPLETED': 100, 'DONE': 100, 'FINISHED': 100, 'CLOSED': 100,
            'IN_PROGRESS': 50, 'IN PROGRESS': 50, 'PROGRESS': 50, 'WORKING': 50,
            'IN_REVIEW': 75, 'REVIEW': 75, 'TESTING': 80, 'QA': 80,
            'PENDING': 10, 'OPEN': 10, 'NEW': 5, 'NOT_STARTED': 0,
            'BLOCKED': 20, 'STUCK': 20,
            'CANCELLED': 0, 'CANCELED': 0,
        }
        
        if status_upper in STATUS_PROGRESS_MAP:
            return STATUS_PROGRESS_MAP[status_upper]
        
        for key, value in STATUS_PROGRESS_MAP.items():
            if key in status_upper or status_upper in key:
                return value
        
        return 0
    
    # ============================================
    # 4. ANÁLISIS: REGRESIÓN GASTO VS TIEMPO
    # ============================================
    @staticmethod
    def _ejecutar_regresion_gasto_tiempo(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """
        Ejecuta regresión lineal Gasto vs Tiempo (HÍBRIDO)
        """
        try:
            import pandas as pd
            from sklearn.linear_model import LinearRegression
            
            if len(datos) < AnalisisService.MIN_TAREAS_REGISTROS:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'regresion_gasto_tiempo'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0,
                    'recomendaciones': ['Agrega más tareas al proyecto']
                }
            
            df = pd.DataFrame(datos)
            
            var_tiempo = config.get('variable_tiempo', 'dias_desde_inicio')
            var_gasto = config.get('variable_dependiente', 'costo_tarea')
            
            df_valid = df[[var_tiempo, var_gasto]].dropna()
            
            if len(df_valid) < AnalisisService.MIN_TAREAS_REGISTROS:
                return {
                    'resultados': {'error': f'Solo {len(df_valid)} datos válidos', 'tipo': 'regresion_gasto_tiempo'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0,
                    'recomendaciones': ['Completa las fechas y costos de las tareas']
                }
            
            X = df_valid[var_tiempo].values.reshape(-1, 1)
            y = df_valid[var_gasto].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            y_pred = model.predict(X)
            r2 = model.score(X, y)
            mse = ((y - y_pred) ** 2).mean()
            
            dias_proyectar = config.get('dias_proyectar', 30)
            max_dias = df_valid[var_tiempo].max()
            dias_futuros = list(range(int(max_dias) + 1, int(max_dias) + dias_proyectar + 1))
            X_futuro = [[d] for d in dias_futuros]
            y_futuro = model.predict(X_futuro)
            
            dias_totales = max_dias + dias_proyectar
            gasto_estimado_final = model.predict([[dias_totales]])[0] if dias_totales > 0 else 0
            
            presupuesto_total = reporte.presupuesto_total or 1
            desviacion_porcentaje = ((gasto_estimado_final - presupuesto_total) / presupuesto_total) * 100
            
            if desviacion_porcentaje > 30:
                nivel_riesgo = 'critico'
            elif desviacion_porcentaje > 20:
                nivel_riesgo = 'alto'
            elif desviacion_porcentaje > 10:
                nivel_riesgo = 'medio'
            else:
                nivel_riesgo = 'bajo'
            
            recomendaciones = []
            alertas = []
            
            if desviacion_porcentaje > 20:
                recomendaciones.append(f"⚠️ Desviación presupuestaria del {desviacion_porcentaje:.1f}%")
                recomendaciones.append("Revisar tareas con mayor costo por día")
                recomendaciones.append("Negociar ampliación de presupuesto")
                alertas.append({
                    'tipo': 'critical' if desviacion_porcentaje > 30 else 'warning',
                    'codigo': 'BUDGET-001',
                    'mensaje': f'Desviación presupuestaria del {desviacion_porcentaje:.1f}%',
                    'recomendacion': 'Revisar gastos operativos'
                })
            else:
                recomendaciones.append(f"✅ Proyecto en línea con presupuesto")
            
            return {
                'resultados': {
                    'ecuacion': f"y = {model.coef_[0]:.2f}x + {model.intercept_:.2f}",
                    'pendiente': float(model.coef_[0]),
                    'intercepto': float(model.intercept_),
                    'r2_score': float(r2),
                    'mse': float(mse),
                    'gasto_estimado_final': float(gasto_estimado_final),
                    'desviacion_porcentaje': float(desviacion_porcentaje),
                    'presupuesto_total': presupuesto_total,
                    'n_muestras': len(df_valid),
                    'dias_proyectados': dias_proyectar,
                    'max_dias': float(max_dias),
                    'predicciones_futuras': {
                        'dias': dias_futuros,
                        'gasto_estimado': [float(v) for v in y_futuro]
                    }
                },
                'datos_grafica': {
                    'dias_reales': df_valid[var_tiempo].tolist(),
                    'gasto_real': df_valid[var_gasto].tolist(),
                    'gasto_predicho': [float(v) for v in y_pred],
                    'dias_futuros': dias_futuros,
                    'gasto_futuro': [float(v) for v in y_futuro],
                    'presupuesto_total': presupuesto_total,
                    'umbral_riesgo': presupuesto_total * 1.2
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(r2),
                'recomendaciones': recomendaciones,
                'alertas': alertas,
                'variable_dependiente': var_gasto,
                'variables_independientes': [var_tiempo]
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'regresion_gasto_tiempo'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 5. ANÁLISIS: CLUSTERING
    # ============================================
    @staticmethod
    def _ejecutar_clustering(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Ejecuta Clustering K-Means (HÍBRIDO)"""
        try:
            import pandas as pd
            from sklearn.cluster import KMeans
            from sklearn.preprocessing import StandardScaler
            from sklearn.metrics import silhouette_score
            
            df = pd.DataFrame(datos)
            variables = config.get('variables', ['progress', 'costo_tarea', 'eficiencia'])
            variables = [v for v in variables if v in df.columns]
            
            if len(variables) < 2:
                return {
                    'resultados': {'error': 'Se necesitan al menos 2 variables', 'tipo': 'clustering'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            X = df[variables].dropna()
            
            if len(X) < 3:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'clustering'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            n_clusters = min(config.get('n_clusters', 3), len(X))
            kmeans = KMeans(n_clusters=n_clusters, random_state=config.get('random_state', 42), n_init=10)
            clusters = kmeans.fit_predict(X_scaled)
            
            silhouette = silhouette_score(X_scaled, clusters) if len(set(clusters)) > 1 else 0
            
            nivel_confianza = max(0, silhouette)
            nivel_riesgo = 'bajo' if silhouette > 0.5 else ('medio' if silhouette > 0.3 else 'alto')
            
            return {
                'resultados': {
                    'n_clusters': n_clusters,
                    'clusters': clusters.tolist(),
                    'centroides': kmeans.cluster_centers_.tolist(),
                    'inercia': float(kmeans.inertia_),
                    'silhouette_score': float(silhouette),
                    'n_muestras': len(X)
                },
                'datos_grafica': {
                    'data': X_scaled.tolist(),
                    'clusters': clusters.tolist(),
                    'centroides': kmeans.cluster_centers_.tolist(),
                    'variables': variables
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(nivel_confianza),
                'variables_independientes': variables,
                'recomendaciones': [
                    f"✅ Clustering completado con {n_clusters} grupos",
                    f"📊 Silhouette Score: {silhouette:.3f}"
                ]
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'clustering'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 6. ANÁLISIS: PCA
    # ============================================
    @staticmethod
    def _ejecutar_pca(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Ejecuta PCA (HÍBRIDO)"""
        try:
            import pandas as pd
            from sklearn.decomposition import PCA
            from sklearn.preprocessing import StandardScaler
            
            df = pd.DataFrame(datos)
            variables = config.get('variables', ['progress', 'hours_spent', 'costo_tarea', 'eficiencia'])
            variables = [v for v in variables if v in df.columns]
            
            if len(variables) < 2:
                return {
                    'resultados': {'error': 'Se necesitan al menos 2 variables', 'tipo': 'pca'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            X = df[variables].dropna()
            
            if len(X) < 2:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'pca'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            n_componentes = min(config.get('n_componentes', 2), len(X.columns), len(X))
            pca = PCA(n_components=n_componentes)
            X_pca = pca.fit_transform(X_scaled)
            
            varianza_explicada = pca.explained_variance_ratio_.tolist()
            componentes = {}
            for i, col in enumerate(X.columns):
                componentes[col] = {
                    f'PC{j+1}': float(pca.components_[j][i]) 
                    for j in range(n_componentes)
                }
            
            nivel_confianza = sum(varianza_explicada)
            nivel_riesgo = 'bajo' if nivel_confianza > 0.8 else 'medio'
            
            return {
                'resultados': {
                    'varianza_explicada': varianza_explicada,
                    'varianza_acumulada': [sum(varianza_explicada[:i+1]) for i in range(len(varianza_explicada))],
                    'componentes': componentes,
                    'n_componentes': n_componentes,
                    'n_variables': len(X.columns),
                    'n_muestras': len(X)
                },
                'datos_grafica': {
                    'data': X_pca.tolist() if len(X_pca) > 0 else [],
                    'labels': [f'Muestra {i+1}' for i in range(len(X_pca))],
                    'varianza_explicada': varianza_explicada,
                    'columnas': X.columns.tolist()
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(nivel_confianza),
                'variables_independientes': variables,
                'recomendaciones': [
                    f"✅ Las {n_componentes} componentes principales explican {nivel_confianza:.1%} de la varianza"
                ]
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'pca'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 7. ANÁLISIS: ESTADÍSTICAS DESCRIPTIVAS
    # ============================================
    @staticmethod
    def _ejecutar_estadisticas(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Ejecuta Estadísticas Descriptivas (HÍBRIDO)"""
        try:
            import pandas as pd
            import numpy as np
            
            if not datos:
                return {
                    'resultados': {'error': 'No hay datos para analizar', 'tipo': 'estadisticas'},
                    'nivel_confianza': 0
                }
            
            df = pd.DataFrame(datos)
            
            variables = config.get('variables', [
                'progress', 'hours_spent', 'costo_tarea', 
                'eficiencia', 'productividad', 'porcentaje_presupuesto',
                'dias_desde_inicio', 'dias_hasta_entrega'
            ])
            
            variables = [v for v in variables if v in df.columns]
            
            if not variables:
                return {
                    'resultados': {'error': 'No hay variables numéricas', 'tipo': 'estadisticas'},
                    'nivel_confianza': 0
                }
            
            estadisticas = {}
            for col in variables:
                if col not in df.columns:
                    continue
                series = df[col].dropna()
                if len(series) > 0:
                    estadisticas[col] = {
                        'count': int(len(series)),
                        'mean': float(series.mean()),
                        'std': float(series.std()) if len(series) > 1 else 0,
                        'min': float(series.min()),
                        '25%': float(series.quantile(0.25)) if len(series) > 1 else float(series.min()),
                        '50%': float(series.median()),
                        '75%': float(series.quantile(0.75)) if len(series) > 1 else float(series.max()),
                        'max': float(series.max()),
                        'missing': int(df[col].isna().sum())
                    }
            
            correlacion = {}
            if len(variables) > 1:
                df_corr = df[variables].dropna()
                if len(df_corr) > 1:
                    corr_matrix = df_corr.corr()
                    correlacion = corr_matrix.to_dict()
            
            return {
                'resultados': {
                    'estadisticas': estadisticas,
                    'correlacion': correlacion,
                    'variables': variables,
                    'n_muestras': len(df),
                    'n_variables': len(variables)
                },
                'datos_grafica': {
                    'estadisticas': estadisticas,
                    'correlacion': correlacion,
                    'variables': variables
                },
                'nivel_confianza': 1.0,
                'variables_independientes': variables,
                'recomendaciones': [
                    f"✅ Análisis estadístico completado con {len(df)} registros",
                    f"📊 {len(variables)} variables analizadas"
                ]
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'estadisticas'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 8. ANÁLISIS: REGRESIÓN (GENERAL)
    # ============================================
    @staticmethod
    def _ejecutar_regresion(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Ejecuta Regresión Lineal General (HÍBRIDO)"""
        try:
            import pandas as pd
            from sklearn.linear_model import LinearRegression
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import mean_squared_error, r2_score
            
            df = pd.DataFrame(datos)
            
            var_dependiente = config.get('variable_dependiente', 'costo_tarea')
            var_independientes = config.get('variables_independientes', ['progress', 'hours_spent'])
            var_independientes = [v for v in var_independientes if v in df.columns]
            
            if var_dependiente not in df.columns:
                return {
                    'resultados': {'error': f'Variable dependiente "{var_dependiente}" no encontrada', 'tipo': 'regresion'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            if not var_independientes:
                return {
                    'resultados': {'error': 'No hay variables independientes válidas', 'tipo': 'regresion'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            X = df[var_independientes].dropna()
            y = df.loc[X.index, var_dependiente]
            
            if len(X) < 2:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'regresion'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            test_size = config.get('test_size', 0.2)
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )
            
            model = LinearRegression()
            model.fit(X_train, y_train)
            
            y_pred_test = model.predict(X_test)
            
            r2 = r2_score(y_test, y_pred_test)
            mse = mean_squared_error(y_test, y_pred_test)
            
            nivel_riesgo = 'bajo' if r2 > 0.8 else ('medio' if r2 > 0.6 else 'alto')
            
            return {
                'resultados': {
                    'coeficientes': dict(zip(var_independientes, model.coef_.tolist())),
                    'intercepto': float(model.intercept_),
                    'r2_score': float(r2),
                    'mse': float(mse),
                    'n_muestras': len(X),
                    'test_size': test_size
                },
                'datos_grafica': {
                    'reales': y_test.tolist() if len(y_test) > 0 else [],
                    'predicciones': y_pred_test.tolist() if len(y_pred_test) > 0 else []
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(r2),
                'variable_dependiente': var_dependiente,
                'variables_independientes': var_independientes,
                'recomendaciones': [
                    f"📊 R² = {r2:.3f}",
                    f"✅ Modelo de regresión completado con {len(X)} muestras"
                ]
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'regresion'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 9. ANÁLISIS: DESVIACIÓN DE PLAZOS
    # ============================================
    @staticmethod
    def _ejecutar_desviacion_plazos(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Análisis de desviación de plazos (HÍBRIDO)"""
        try:
            import pandas as pd
            import numpy as np
            
            df = pd.DataFrame(datos)
            
            if len(df) == 0:
                return {
                    'resultados': {'error': 'No hay datos', 'tipo': 'desviacion_plazos'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            retrasos = []
            for _, row in df.iterrows():
                retraso = row.get('dias_retraso', 0)
                if row.get('is_overdue', False):
                    retrasos.append(retraso)
                elif row.get('is_completed', False):
                    retrasos.append(0)
                else:
                    dias_hasta_entrega = row.get('dias_hasta_entrega', 0)
                    if dias_hasta_entrega and dias_hasta_entrega < 0:
                        retrasos.append(abs(dias_hasta_entrega))
                    else:
                        retrasos.append(0)
            
            df['retraso'] = retrasos
            
            retrasos_validos = [r for r in retrasos if r > 0]
            
            if retrasos_validos:
                desviacion_promedio = np.mean(retrasos_validos)
                desviacion_maxima = np.max(retrasos_validos)
                desviacion_minima = np.min(retrasos_validos)
                desviacion_std = np.std(retrasos_validos)
                total_retrasadas = len(retrasos_validos)
            else:
                desviacion_promedio = 0
                desviacion_maxima = 0
                desviacion_minima = 0
                desviacion_std = 0
                total_retrasadas = 0
            
            tareas_criticas = []
            tareas_con_holgura = []
            
            for idx, row in df.iterrows():
                retraso = row.get('retraso', 0)
                if retraso > (desviacion_promedio + desviacion_std):
                    tareas_criticas.append({
                        'id': int(row.get('task_id', idx)),
                        'nombre': row.get('task_name', f'Tarea {idx}'),
                        'retraso': float(retraso),
                        'prioridad': row.get('priority', 'media'),
                        'status': row.get('status', 'desconocido')
                    })
                elif retraso == 0 and row.get('status') != 'COMPLETED':
                    tareas_con_holgura.append({
                        'id': int(row.get('task_id', idx)),
                        'nombre': row.get('task_name', f'Tarea {idx}'),
                        'dias_hasta_entrega': row.get('dias_hasta_entrega', 0),
                        'prioridad': row.get('priority', 'media')
                    })
            
            retraso_total_proyecto = sum([t['retraso'] for t in tareas_criticas])
            impacto_fecha_fin = retraso_total_proyecto * 0.3
            
            total_tareas = len(df)
            completadas = sum(1 for _, row in df.iterrows() if row.get('is_completed', False))
            
            if completadas > 0 and total_tareas > 0:
                probabilidad = (1 - (total_retrasadas / total_tareas)) * 100
            else:
                probabilidad = 50
            
            probabilidad = max(0, min(100, probabilidad))
            
            if probabilidad < 40:
                nivel_riesgo = 'critico'
            elif probabilidad < 60:
                nivel_riesgo = 'alto'
            elif probabilidad < 80:
                nivel_riesgo = 'medio'
            else:
                nivel_riesgo = 'bajo'
            
            recomendaciones = []
            if tareas_criticas:
                recomendaciones.append(f"⚠️ {len(tareas_criticas)} tareas críticas identificadas")
                recomendaciones.append(f"Retraso total estimado: {impacto_fecha_fin:.1f} días")
                recomendaciones.append("Priorizar tareas críticas para recuperar el cronograma")
            
            if tareas_con_holgura:
                recomendaciones.append(f"📋 {len(tareas_con_holgura)} tareas con holgura disponibles")
            
            return {
                'resultados': {
                    'desviacion_promedio': float(desviacion_promedio),
                    'desviacion_maxima': float(desviacion_maxima),
                    'desviacion_minima': float(desviacion_minima),
                    'desviacion_std': float(desviacion_std),
                    'total_tareas_retrasadas': total_retrasadas,
                    'total_tareas': len(df),
                    'tareas_criticas': tareas_criticas,
                    'tareas_con_holgura': tareas_con_holgura,
                    'impacto_fecha_fin': float(impacto_fecha_fin),
                    'probabilidad_cumplir_plazo': float(probabilidad),
                    'retrasos': [float(r) for r in retrasos]
                },
                'datos_grafica': {
                    'tareas': df['task_name'].tolist() if 'task_name' in df.columns else list(range(len(df))),
                    'retrasos': [float(r) for r in retrasos],
                    'umbral_critico': float(desviacion_promedio + desviacion_std) if desviacion_std > 0 else 5
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': probabilidad / 100,
                'recomendaciones': recomendaciones,
                'alertas': [
                    {
                        'tipo': 'critical' if nivel_riesgo == 'critico' else 'warning',
                        'codigo': 'SCHED-001',
                        'mensaje': f'{len(tareas_criticas)} tareas críticas con retraso',
                        'recomendacion': 'Revisar planificación y recursos'
                    }
                ] if tareas_criticas else []
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'desviacion_plazos'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 10. ANÁLISIS: CURVA S
    # ============================================
    @staticmethod
    def _ejecutar_curva_s(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Análisis de Curva S (HÍBRIDO)"""
        try:
            import pandas as pd
            import numpy as np
            from scipy import stats
            
            df = pd.DataFrame(datos)
            
            if len(df) < 2:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'curva_s'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            df = df.sort_values('created_at').reset_index(drop=True)
            
            df['costo_acumulado'] = df['costo_tarea'].cumsum()
            df['progreso_acumulado'] = df['progress'].cumsum() / len(df)
            
            total_costo = df['costo_acumulado'].max() or 1
            
            df['porcentaje_costo'] = (df['costo_acumulado'] / total_costo) * 100
            df['porcentaje_progreso'] = df['progreso_acumulado'] * 100
            
            df['desviacion'] = df['porcentaje_costo'] - df['porcentaje_progreso']
            
            x = range(len(df))
            x_mean = np.mean(x)
            y_mean = np.mean(df['porcentaje_progreso'])
            
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, df['porcentaje_progreso'])
            
            def curva_s_logistica(x, L, k, x0):
                return L / (1 + np.exp(-k * (x - x0)))
            
            try:
                from scipy.optimize import curve_fit
                x_data = np.array(x)
                y_data = df['porcentaje_progreso'].values
                
                L = 100
                k = 0.5
                x0 = len(df) / 2
                
                popt, _ = curve_fit(curva_s_logistica, x_data, y_data, p0=[L, k, x0], maxfev=5000)
                curva_s_teorica = curva_s_logistica(x_data, *popt)
            except:
                curva_s_teorica = df['porcentaje_progreso'].values
            
            desviacion_curva = df['porcentaje_progreso'].values - curva_s_teorica
            desviacion_promedio = np.mean(desviacion_curva)
            
            if abs(desviacion_promedio) > 20:
                nivel_riesgo = 'critico'
            elif abs(desviacion_promedio) > 10:
                nivel_riesgo = 'alto'
            elif abs(desviacion_promedio) > 5:
                nivel_riesgo = 'medio'
            else:
                nivel_riesgo = 'bajo'
            
            recomendaciones = []
            if desviacion_promedio > 10:
                recomendaciones.append(f"📊 Avance físico ({df['porcentaje_progreso'].iloc[-1]:.1f}%) vs financiero ({df['porcentaje_costo'].iloc[-1]:.1f}%)")
                recomendaciones.append("⚠️ El costo está superando al avance físico")
                recomendaciones.append("Revisar tareas con bajo rendimiento")
            elif desviacion_promedio < -10:
                recomendaciones.append("✅ Avance físico supera al financiero")
                recomendaciones.append("Posible mejora de eficiencia")
            
            return {
                'resultados': {
                    'desviacion_curva': [float(v) for v in desviacion_curva],
                    'avance_fisico': df['porcentaje_progreso'].tolist(),
                    'avance_financiero': df['porcentaje_costo'].tolist(),
                    'curva_s_teorica': [float(v) for v in curva_s_teorica],
                    'desviacion_promedio': float(desviacion_promedio),
                    'pendiente_tendencia': float(slope),
                    'r2_tendencia': float(r_value ** 2),
                    'n_muestras': len(df)
                },
                'datos_grafica': {
                    'indice': list(range(len(df))),
                    'avance_fisico': df['porcentaje_progreso'].tolist(),
                    'avance_financiero': df['porcentaje_costo'].tolist(),
                    'curva_s_teorica': [float(v) for v in curva_s_teorica],
                    'desviacion': [float(v) for v in desviacion_curva]
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(r_value ** 2) if r_value else 0,
                'recomendaciones': recomendaciones,
                'alertas': [
                    {
                        'tipo': 'critical' if nivel_riesgo == 'critico' else 'warning',
                        'codigo': 'S-001',
                        'mensaje': f'Desviación promedio de la Curva S: {desviacion_promedio:.1f}%',
                        'recomendacion': 'Revisar planificación de recursos'
                    }
                ] if abs(desviacion_promedio) > 10 else []
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'curva_s'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 11. ANÁLISIS: RENDIMIENTO EMPLEADO
    # ============================================
    @staticmethod
    def _ejecutar_regresion_rendimiento_empleado(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Análisis de rendimiento del empleado (HÍBRIDO)"""
        try:
            import pandas as pd
            from sklearn.linear_model import LinearRegression
            import numpy as np
            
            df = pd.DataFrame(datos)
            
            if len(df) == 0:
                return {
                    'resultados': {'error': 'No hay datos', 'tipo': 'regresion_rendimiento_empleado'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            if 'empleado' in df.columns:
                empleado_analizado = config.get('empleado_analizado')
                if empleado_analizado:
                    df_empleado = df[df['empleado'] == empleado_analizado]
                else:
                    df_empleado = df
            else:
                df_empleado = df
            
            if len(df_empleado) == 0:
                return {
                    'resultados': {'error': f'No hay tareas para el empleado {empleado_analizado or "principal"}', 'tipo': 'regresion_rendimiento_empleado'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            df_empleado = df_empleado.sort_values('created_at').reset_index(drop=True)
            df_empleado['task_number'] = range(1, len(df_empleado) + 1)
            
            if 'due_date' in df_empleado.columns and 'created_at' in df_empleado.columns:
                df_empleado['retraso'] = df_empleado.apply(
                    lambda row: AnalisisService._calcular_retraso_simple(
                        row.get('due_date'), 
                        row.get('created_at'),
                        row.get('status')
                    ),
                    axis=1
                )
            else:
                df_empleado['retraso'] = 100 - df_empleado['progress']
            
            df_valid = df_empleado[['task_number', 'retraso']].dropna()
            
            if len(df_valid) < 3:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'regresion_rendimiento_empleado'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            X = df_valid['task_number'].values.reshape(-1, 1)
            y = df_valid['retraso'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            y_pred = model.predict(X)
            r2 = model.score(X, y)
            
            pendiente = model.coef_[0]
            if pendiente > 1:
                tendencia = 'deteriorando'
                mensaje_tendencia = 'El rendimiento está empeorando significativamente'
            elif pendiente > 0.2:
                tendencia = 'estable_con_deterioro'
                mensaje_tendencia = 'El rendimiento está empeorando lentamente'
            elif pendiente > -0.2:
                tendencia = 'estable'
                mensaje_tendencia = 'El rendimiento se mantiene estable'
            elif pendiente > -1:
                tendencia = 'mejorando'
                mensaje_tendencia = 'El rendimiento está mejorando'
            else:
                tendencia = 'mejorando_rapido'
                mensaje_tendencia = 'El rendimiento está mejorando significativamente'
            
            num_tareas = len(df_valid)
            riesgo_sobrecarga = min(
                100,
                (pendiente * 20 + num_tareas * 3) if pendiente > 0 else max(0, 30 - abs(pendiente) * 10)
            )
            riesgo_sobrecarga = max(0, min(100, riesgo_sobrecarga))
            
            retrasos = df_valid['retraso'].values
            promedio_retraso = retrasos.mean()
            desviacion_retraso = retrasos.std()
            tareas_retrasadas = sum(1 for r in retrasos if r > 0)
            
            proxima_tarea = len(df_valid) + 1
            prediccion_proxima = model.predict([[proxima_tarea]])[0]
            
            if riesgo_sobrecarga > 80:
                nivel_riesgo = 'critico'
            elif riesgo_sobrecarga > 60:
                nivel_riesgo = 'alto'
            elif riesgo_sobrecarga > 40:
                nivel_riesgo = 'medio'
            else:
                nivel_riesgo = 'bajo'
            
            recomendaciones = []
            if riesgo_sobrecarga > 70:
                recomendaciones.append(f"⚠️ Riesgo crítico de sobrecarga: {riesgo_sobrecarga:.0f}%")
                recomendaciones.append(f"Reasignar {int(num_tareas * 0.3)} tareas a otro empleado")
                recomendaciones.append("Reducir carga semanal en un 20%")
            elif riesgo_sobrecarga > 50:
                recomendaciones.append(f"📊 Riesgo moderado de sobrecarga: {riesgo_sobrecarga:.0f}%")
                recomendaciones.append("Distribuir tareas de manera más equitativa")
            
            if promedio_retraso > 5:
                recomendaciones.append(f"📈 Retraso promedio de {promedio_retraso:.1f} días por tarea")
                recomendaciones.append("Revisar estimaciones iniciales")
            
            return {
                'resultados': {
                    'empleado': empleado_analizado or 'Empleado Principal',
                    'pendiente': float(pendiente),
                    'intercepto': float(model.intercept_),
                    'r2_score': float(r2),
                    'tendencia': tendencia,
                    'mensaje_tendencia': mensaje_tendencia,
                    'total_tareas': int(num_tareas),
                    'tareas_retrasadas': int(tareas_retrasadas),
                    'promedio_retraso': float(promedio_retraso),
                    'desviacion_retraso': float(desviacion_retraso),
                    'riesgo_sobrecarga': float(riesgo_sobrecarga),
                    'prediccion_proxima_tarea': float(prediccion_proxima),
                    'datos_retrasos': retrasos.tolist()
                },
                'datos_grafica': {
                    'task_numbers': df_valid['task_number'].tolist(),
                    'retrasos': retrasos.tolist(),
                    'tendencia_lineal': [float(v) for v in y_pred],
                    'promedio_retraso': float(promedio_retraso),
                    'umbral_riesgo': 5
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(r2) if r2 > 0 else 0,
                'recomendaciones': recomendaciones,
                'alertas': [
                    {
                        'tipo': 'critical' if riesgo_sobrecarga > 70 else 'warning',
                        'codigo': 'PERF-001',
                        'mensaje': f'Riesgo de sobrecarga del {riesgo_sobrecarga:.0f}%',
                        'recomendacion': 'Revisar distribución de tareas'
                    }
                ] if riesgo_sobrecarga > 50 else [],
                'empleado_analizado': empleado_analizado or 'Empleado Principal'
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'regresion_rendimiento_empleado'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 12. ANÁLISIS: REGRESIÓN PRESUPUESTO VS PLAZO
    # ============================================
    @staticmethod
    def _ejecutar_regresion_presupuesto_plazo(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Análisis Presupuesto vs Plazo (HÍBRIDO)"""
        try:
            import pandas as pd
            from sklearn.linear_model import LinearRegression
            
            df = pd.DataFrame(datos)
            
            presupuesto_total = reporte.presupuesto_total or 1
            presupuesto_gastado = reporte.presupuesto_gastado or 0
            
            df['avance_real'] = df['progress'] / 100
            df['costo_real'] = df['costo_tarea']
            df['costo_acumulado'] = df['costo_tarea'].cumsum()
            df['avance_acumulado'] = df['progress'].cumsum() / len(df) if len(df) > 0 else 0
            
            df['valor_ganado'] = df['avance_real'] * presupuesto_total
            df['cpi'] = df['valor_ganado'] / (df['costo_real'] + 1)
            
            df['valor_planeado'] = (df['dias_desde_inicio'] / max(1, df['dias_desde_inicio'].max())) * presupuesto_total
            df['spi'] = df['valor_ganado'] / (df['valor_planeado'] + 1)
            
            df_valid = df[['dias_desde_inicio', 'costo_acumulado']].dropna()
            
            if len(df_valid) < 2:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'regresion_presupuesto_plazo'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            X = df_valid['dias_desde_inicio'].values.reshape(-1, 1)
            y = df_valid['costo_acumulado'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            r2 = model.score(X, y)
            pendiente = model.coef_[0]
            intercepto = model.intercept_
            
            if pendiente > 0:
                dias_quiebre = (presupuesto_total - intercepto) / pendiente
            else:
                dias_quiebre = None
            
            cpi_promedio = df['cpi'].mean() if 'cpi' in df.columns else 0
            spi_promedio = df['spi'].mean() if 'spi' in df.columns else 0
            
            if cpi_promedio < 0.8 or spi_promedio < 0.8:
                nivel_riesgo = 'critico'
            elif cpi_promedio < 0.9 or spi_promedio < 0.9:
                nivel_riesgo = 'alto'
            elif cpi_promedio < 1.0 or spi_promedio < 1.0:
                nivel_riesgo = 'medio'
            else:
                nivel_riesgo = 'bajo'
            
            recomendaciones = []
            if cpi_promedio < 0.8:
                recomendaciones.append(f"⚠️ CPI crítico: {cpi_promedio:.2f}. El presupuesto no está siendo eficiente")
                recomendaciones.append("Reducir costos en tareas con bajo valor agregado")
            if spi_promedio < 0.8:
                recomendaciones.append(f"⚠️ SPI crítico: {spi_promedio:.2f}. El proyecto va más lento de lo planeado")
                recomendaciones.append("Revisar dependencias críticas y recursos")
            
            return {
                'resultados': {
                    'pendiente': float(pendiente),
                    'intercepto': float(intercepto),
                    'r2_score': float(r2),
                    'cpi_promedio': float(cpi_promedio),
                    'spi_promedio': float(spi_promedio),
                    'presupuesto_total': presupuesto_total,
                    'dias_quiebre': dias_quiebre,
                    'dias_fin_estimados': (presupuesto_total * 1.2 - intercepto) / pendiente if pendiente > 0 else len(df),
                    'n_muestras': len(df_valid)
                },
                'datos_grafica': {
                    'dias': df_valid['dias_desde_inicio'].tolist(),
                    'costo_acumulado': df_valid['costo_acumulado'].tolist(),
                    'tendencia': [float(v) for v in model.predict(X)],
                    'presupuesto_total': presupuesto_total,
                    'presupuesto_gastado': presupuesto_gastado
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(r2),
                'recomendaciones': recomendaciones,
                'alertas': [
                    {
                        'tipo': 'critical' if nivel_riesgo == 'critico' else 'warning',
                        'codigo': 'FIN-001',
                        'mensaje': f'CPI: {cpi_promedio:.2f}, SPI: {spi_promedio:.2f}',
                        'recomendacion': 'Revisar planificación financiera'
                    }
                ] if nivel_riesgo in ['critico', 'alto'] else []
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'regresion_presupuesto_plazo'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 13. ANÁLISIS: PREDICCIÓN DE FIN
    # ============================================
    @staticmethod
    def _ejecutar_prediccion_fin(
        datos: List[Dict[str, Any]],
        config: Dict[str, Any],
        reporte: ReporteProyecto,
        project: Project,
        db: Session
    ) -> Dict[str, Any]:
        """Predicción de fecha de fin (HÍBRIDO)"""
        try:
            import pandas as pd
            from sklearn.linear_model import LinearRegression
            
            df = pd.DataFrame(datos)
            
            if len(df) < 2:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'prediccion_fin'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            df_valid = df[['dias_desde_inicio', 'progress']].dropna()
            
            if len(df_valid) < 2:
                return {
                    'resultados': {'error': 'Datos insuficientes', 'tipo': 'prediccion_fin'},
                    'nivel_riesgo': 'n/a',
                    'nivel_confianza': 0
                }
            
            X = df_valid['dias_desde_inicio'].values.reshape(-1, 1)
            y = df_valid['progress'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            r2 = model.score(X, y)
            
            if model.coef_[0] > 0:
                dias_totales = (100 - model.intercept_) / model.coef_[0]
            else:
                dias_totales = df_valid['dias_desde_inicio'].max() * 2
            
            fecha_inicio = reporte.fecha_inicio
            fecha_estimada_fin = None
            if fecha_inicio and isinstance(fecha_inicio, date):
                fecha_estimada_fin = fecha_inicio + timedelta(days=int(dias_totales))
            
            fecha_planeada = reporte.fecha_fin_planeada
            dias_diferencia = 0
            if fecha_planeada and fecha_estimada_fin:
                if isinstance(fecha_planeada, date) and isinstance(fecha_estimada_fin, date):
                    dias_diferencia = (fecha_estimada_fin - fecha_planeada).days
            
            if r2 > 0.8 and abs(dias_diferencia) < 5:
                probabilidad = 90
            elif r2 > 0.6 and abs(dias_diferencia) < 10:
                probabilidad = 70
            elif r2 > 0.4:
                probabilidad = 50
            else:
                probabilidad = 30
            
            if dias_diferencia > 30:
                nivel_riesgo = 'critico'
            elif dias_diferencia > 15:
                nivel_riesgo = 'alto'
            elif dias_diferencia > 5:
                nivel_riesgo = 'medio'
            else:
                nivel_riesgo = 'bajo'
            
            recomendaciones = []
            if dias_diferencia > 15:
                recomendaciones.append(f"⚠️ El proyecto terminaría {dias_diferencia} días después de lo planeado")
                recomendaciones.append("Necesita negociar extensión de plazo")
            elif dias_diferencia > 5:
                recomendaciones.append(f"📊 Posible retraso de {dias_diferencia} días")
                recomendaciones.append("Acelerar tareas críticas")
            elif dias_diferencia < -5:
                recomendaciones.append(f"✅ Posible adelanto de {abs(dias_diferencia)} días")
            else:
                recomendaciones.append("✅ Proyecto en línea con lo planeado")
            
            return {
                'resultados': {
                    'dias_totales_estimados': float(dias_totales),
                    'fecha_estimada_fin': fecha_estimada_fin.isoformat() if fecha_estimada_fin else None,
                    'fecha_planeada_fin': fecha_planeada.isoformat() if fecha_planeada else None,
                    'dias_diferencia': int(dias_diferencia),
                    'r2_score': float(r2),
                    'pendiente': float(model.coef_[0]),
                    'intercepto': float(model.intercept_),
                    'probabilidad_cumplir': float(probabilidad),
                    'n_muestras': len(df_valid)
                },
                'datos_grafica': {
                    'dias': df_valid['dias_desde_inicio'].tolist(),
                    'progreso': df_valid['progress'].tolist(),
                    'tendencia': [float(v) for v in model.predict(X)],
                    'dias_totales': float(dias_totales),
                    'progreso_objetivo': 100
                },
                'nivel_riesgo': nivel_riesgo,
                'nivel_confianza': float(r2),
                'recomendaciones': recomendaciones,
                'alertas': [
                    {
                        'tipo': 'critical' if nivel_riesgo == 'critico' else 'warning',
                        'codigo': 'END-001',
                        'mensaje': f'Posible retraso de {dias_diferencia} días',
                        'recomendacion': 'Revisar planificación y recursos'
                    }
                ] if dias_diferencia > 15 else []
            }
            
        except Exception as e:
            return {
                'resultados': {'error': str(e), 'tipo': 'prediccion_fin'},
                'datos_grafica': None,
                'nivel_riesgo': 'error',
                'nivel_confianza': 0
            }
    
    # ============================================
    # 14. FUNCIÓN AUXILIAR: CALCULAR RETRASO
    # ============================================
    @staticmethod
    def _calcular_retraso_simple(due_date, created_at, status) -> float:
        """Calcula el retraso en días de una tarea"""
        try:
            if not due_date:
                return 0
            
            if isinstance(due_date, str):
                due_date = datetime.fromisoformat(due_date).date()
            elif isinstance(due_date, datetime):
                due_date = due_date.date()
            
            now = datetime.now().date()
            return max(0, (now - due_date).days)
            
        except Exception:
            return 0
    
    # ============================================
    # 15. EJECUTAR ANÁLISIS SELECCIONADOS
    # ============================================
    @staticmethod
    def ejecutar_analisis_seleccionados(
        reporte_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Ejecuta todos los análisis seleccionados en la configuración del reporte"""
        reporte = db.query(ReporteProyecto).filter(
            ReporteProyecto.id == reporte_id,
            ReporteProyecto.activo == True
        ).first()
        
        if not reporte:
            return {"error": "Reporte no encontrado"}
        
        config_analisis = reporte.configuracion_analisis or {}
        resultados = []
        errores = []
        
        analisis_map = {
            'pca': {'nombre': 'PCA - Análisis de Componentes Principales', 'config': {'n_componentes': 2}},
            'regresion': {'nombre': 'Regresión Lineal', 'config': {'variable_dependiente': 'costo_tarea'}},
            'clustering': {'nombre': 'Clustering - K-Means', 'config': {'n_clusters': 3}},
            'estadisticas': {'nombre': 'Estadísticas Descriptivas', 'config': {}},
            'regresion_gasto_tiempo': {'nombre': 'Gasto vs Tiempo', 'config': {}},
            'regresion_rendimiento_empleado': {'nombre': 'Rendimiento del Empleado', 'config': {}},
            'regresion_presupuesto_plazo': {'nombre': 'Presupuesto vs Plazo', 'config': {}},
            'curva_s': {'nombre': 'Curva S', 'config': {}},
            'desviacion_plazos': {'nombre': 'Desviación de Plazos', 'config': {}},
            'prediccion_fin': {'nombre': 'Predicción de Fin', 'config': {}}
        }
        
        for tipo, habilitado in config_analisis.items():
            if habilitado and tipo in analisis_map:
                try:
                    config = {
                        'tipo_analisis': tipo,
                        'nombre': analisis_map[tipo]['nombre'],
                        **analisis_map[tipo]['config']
                    }
                    analisis = AnalisisService.ejecutar_analisis(reporte_id, config, db)
                    resultados.append({
                        'tipo': tipo,
                        'exito': True,
                        'id': analisis.id,
                        'nombre': analisis.nombre
                    })
                except Exception as e:
                    errores.append({
                        'tipo': tipo,
                        'error': str(e)
                    })
        
        return {
            'mensaje': f"Análisis ejecutados: {len(resultados)} exitosos, {len(errores)} errores",
            'resultados': resultados,
            'errores': errores,
            'total': len(resultados) + len(errores)
        }
    
    # ============================================
    # 16. MÉTODOS AUXILIARES PARA EL SERVICIO
    # ============================================
    @staticmethod
    def obtener_analisis_reporte(
        reporte_id: int,
        db: Session,
        incluir_inactivos: bool = False
    ) -> List[AnalisisReporte]:
        """Obtiene todos los análisis de un reporte"""
        query = db.query(AnalisisReporte).filter(
            AnalisisReporte.reporte_id == reporte_id
        )
        if not incluir_inactivos:
            query = query.filter(AnalisisReporte.activo == True)
        return query.order_by(AnalisisReporte.fecha_ejecucion.desc()).all()
    
    @staticmethod
    def obtener_analisis_por_id(
        analisis_id: int,
        db: Session
    ) -> Optional[AnalisisReporte]:
        """Obtiene un análisis por ID"""
        return db.query(AnalisisReporte).filter(
            AnalisisReporte.id == analisis_id,
            AnalisisReporte.activo == True
        ).first()
    
    @staticmethod
    def eliminar_analisis(
        analisis_id: int,
        db: Session
    ) -> bool:
        """Elimina un análisis (soft delete)"""
        analisis = db.query(AnalisisReporte).filter(
            AnalisisReporte.id == analisis_id,
            AnalisisReporte.activo == True
        ).first()
        if not analisis:
            return False
        analisis.activo = False
        db.commit()
        return True
    
    @staticmethod
    def obtener_resumen_analisis(
        reporte_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Obtiene un resumen de todos los análisis del reporte"""
        analisis_list = AnalisisService.obtener_analisis_reporte(reporte_id, db)
        
        return {
            'reporte_id': reporte_id,
            'total_analisis': len(analisis_list),
            'fecha_generacion': datetime.now().isoformat(),
            'analisis': [
                {
                    'id': a.id,
                    'tipo': a.tipo_analisis,
                    'nombre': a.nombre,
                    'fecha_ejecucion': a.fecha_ejecucion.isoformat(),
                    'nivel_riesgo': a.nivel_riesgo,
                    'nivel_confianza': a.nivel_confianza,
                    'alertas': a.alertas,
                    'recomendaciones': a.recomendaciones
                }
                for a in analisis_list
            ]
        }