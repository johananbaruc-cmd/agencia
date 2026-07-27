from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
import json
import time

from app.models.analisis_reporte import AnalisisReporte
from app.models.metrica_proyecto import MetricaProyecto
from app.models.project import Project
from app.schemas.analisis import (
    AnalisisReporteCreate,
    ConfiguracionPCABase,
    ConfiguracionRegresionBase,
    ConfiguracionClusteringBase
)

# Importar librerías de análisis (se instalan con pip)
try:
    import pandas as pd
    import numpy as np
    from sklearn.decomposition import PCA
    from sklearn.linear_model import LinearRegression
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import r2_score, mean_squared_error, silhouette_score
    import matplotlib.pyplot as plt
    import seaborn as sns
    ANALISIS_DISPONIBLE = True
except ImportError:
    ANALISIS_DISPONIBLE = False
    print("⚠️ Librerías de análisis no instaladas. Ejecuta: pip install pandas numpy scikit-learn matplotlib seaborn")

class AnalisisService:
    """Servicio para ejecutar análisis de datos en reportes"""
    
    @staticmethod
    def ejecutar_analisis(
        reporte_id: int,
        configuracion: Dict[str, Any],
        db: Session
    ) -> AnalisisReporte:
        """
        Ejecuta el análisis configurado para un reporte
        """
        if not ANALISIS_DISPONIBLE:
            raise HTTPException(
                status_code=500,
                detail="Librerías de análisis no instaladas"
            )
        
        tipo = configuracion.get('tipo_analisis')
        if not tipo:
            raise HTTPException(
                status_code=400,
                detail="Debes especificar el tipo de análisis"
            )
        
        # Verificar que el reporte existe
        reporte = db.query(ReporteProyecto).filter(
            ReporteProyecto.id == reporte_id,
            ReporteProyecto.activo == True
        ).first()
        
        if not reporte:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")
        
        # Ejecutar según tipo
        if tipo == 'pca':
            resultado = AnalisisService._ejecutar_pca(reporte.project_id, configuracion, db)
        elif tipo == 'regresion':
            resultado = AnalisisService._ejecutar_regresion(reporte.project_id, configuracion, db)
        elif tipo == 'clustering':
            resultado = AnalisisService._ejecutar_clustering(reporte.project_id, configuracion, db)
        elif tipo == 'estadisticas':
            resultado = AnalisisService._ejecutar_estadisticas(reporte.project_id, db)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de análisis no soportado: {tipo}"
            )
        
        # Guardar análisis
        analisis = AnalisisReporte(
            reporte_id=reporte_id,
            tipo_analisis=tipo,
            nombre=configuracion.get('nombre', tipo.upper()),
            descripcion=configuracion.get('descripcion'),
            configuracion=configuracion,
            resultados=resultado.get('resultados'),
            datos_grafica=resultado.get('datos_grafica'),
            grafica_principal=resultado.get('grafica_principal'),
            graficas_adicionales=resultado.get('graficas_adicionales'),
            tiempo_ejecucion_ms=resultado.get('tiempo_ejecucion_ms')
        )
        
        db.add(analisis)
        db.commit()
        db.refresh(analisis)
        
        return analisis
    
    @staticmethod
    def _obtener_datos_proyecto(
        project_id: int,
        db: Session
    ) -> pd.DataFrame:
        """
        Obtiene los datos históricos del proyecto para análisis
        """
        metricas = db.query(MetricaProyecto).filter(
            MetricaProyecto.project_id == project_id
        ).order_by(MetricaProyecto.fecha_medicion).all()
        
        if not metricas:
            raise HTTPException(
                status_code=404,
                detail=f"No hay datos históricos para el proyecto {project_id}. Genera métricas primero."
            )
        
        # Convertir a DataFrame
        data = []
        for m in metricas:
            data.append({
                'fecha': m.fecha_medicion,
                'total_empleados': m.total_empleados or 0,
                'horas_trabajadas': m.horas_trabajadas or 0,
                'productividad': m.productividad or 0,
                'costo_total': m.costo_total or 0,
                'costo_por_hora': m.costo_por_hora or 0,
                'presupuesto_gastado': m.presupuesto_gastado or 0,
                'presupuesto_total': m.presupuesto_total or 0,
                'calidad_porcentaje': m.calidad_porcentaje or 0,
                'avance_porcentaje': m.avance_porcentaje or 0,
                'tareas_completadas': m.tareas_completadas or 0,
                'tareas_pendientes': m.tareas_pendientes or 0,
            })
        
        return pd.DataFrame(data)
    
    @staticmethod
    def _ejecutar_pca(
        project_id: int,
        config: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Ejecuta análisis PCA
        """
        inicio = time.time()
        
        # Obtener datos
        df = AnalisisService._obtener_datos_proyecto(project_id, db)
        
        # Configuración
        n_componentes = config.get('n_componentes', 2)
        variables = config.get('variables', [])
        escalar = config.get('escalar_datos', True)
        
        if len(variables) < 2:
            raise HTTPException(
                status_code=400,
                detail="Se requieren al menos 2 variables para PCA"
            )
        
        # Seleccionar variables
        df_vars = df[variables].copy()
        
        # Escalar datos
        if escalar:
            scaler = StandardScaler()
            df_scaled = scaler.fit_transform(df_vars)
        else:
            df_scaled = df_vars.values
        
        # Ejecutar PCA
        pca = PCA(n_components=min(n_componentes, len(df_scaled[0])))
        pca_result = pca.fit_transform(df_scaled)
        
        # Calcular componentes
        componentes = {}
        for i, var in enumerate(variables):
            componentes[var] = {f'PC{j+1}': float(pca.components_[j][i]) for j in range(pca.n_components_)}
        
        # Generar gráfica
        grafica = AnalisisService._generar_grafica_pca(
            pca_result,
            pca.explained_variance_ratio_,
            variables
        )
        
        tiempo = int((time.time() - inicio) * 1000)
        
        return {
            'resultados': {
                'varianza_explicada': pca.explained_variance_ratio_.tolist(),
                'varianza_acumulada': np.cumsum(pca.explained_variance_ratio_).tolist(),
                'componentes': componentes,
                'n_componentes': pca.n_components_
            },
            'datos_grafica': {
                'pca_result': pca_result.tolist(),
                'varianza': pca.explained_variance_ratio_.tolist()
            },
            'grafica_principal': grafica,
            'tiempo_ejecucion_ms': tiempo
        }
    
    @staticmethod
    def _ejecutar_regresion(
        project_id: int,
        config: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Ejecuta análisis de regresión lineal
        """
        inicio = time.time()
        
        # Obtener datos
        df = AnalisisService._obtener_datos_proyecto(project_id, db)
        
        # Configuración
        var_dependiente = config.get('variable_dependiente')
        vars_independientes = config.get('variables_independientes', [])
        test_size = config.get('test_size', 0.2)
        
        if not var_dependiente:
            raise HTTPException(
                status_code=400,
                detail="Se requiere una variable dependiente"
            )
        
        if len(vars_independientes) < 1:
            raise HTTPException(
                status_code=400,
                detail="Se requiere al menos una variable independiente"
            )
        
        # Preparar datos
        X = df[vars_independientes].values
        y = df[var_dependiente].values
        
        # Dividir datos
        split_idx = int(len(X) * (1 - test_size))
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Escalar
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Ejecutar regresión
        model = LinearRegression()
        model.fit(X_train_scaled, y_train)
        
        # Predicciones
        y_pred = model.predict(X_test_scaled)
        y_pred_train = model.predict(X_train_scaled)
        
        # Métricas
        r2 = r2_score(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        
        # Coeficientes
        coeficientes = dict(zip(vars_independientes, model.coef_.tolist()))
        
        # Generar gráfica
        grafica = AnalisisService._generar_grafica_regresion(
            y_test,
            y_pred,
            var_dependiente
        )
        
        tiempo = int((time.time() - inicio) * 1000)
        
        return {
            'resultados': {
                'coeficientes': coeficientes,
                'intercepto': float(model.intercept_),
                'r2_score': float(r2),
                'mse': float(mse),
                'n_muestras': len(X),
                'r2_entrenamiento': float(r2_score(y_train, y_pred_train))
            },
            'datos_grafica': {
                'reales': y_test.tolist(),
                'predichos': y_pred.tolist()
            },
            'grafica_principal': grafica,
            'tiempo_ejecucion_ms': tiempo
        }
    
    @staticmethod
    def _ejecutar_clustering(
        project_id: int,
        config: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Ejecuta análisis de clustering (K-means)
        """
        inicio = time.time()
        
        # Obtener datos
        df = AnalisisService._obtener_datos_proyecto(project_id, db)
        
        # Configuración
        n_clusters = config.get('n_clusters', 3)
        variables = config.get('variables', [])
        random_state = config.get('random_state', 42)
        
        if len(variables) < 2:
            raise HTTPException(
                status_code=400,
                detail="Se requieren al menos 2 variables para clustering"
            )
        
        # Seleccionar variables
        df_vars = df[variables].copy()
        
        # Escalar
        scaler = StandardScaler()
        df_scaled = scaler.fit_transform(df_vars)
        
        # Ejecutar K-means
        kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
        clusters = kmeans.fit_predict(df_scaled)
        
        # Calcular silhouette score (si hay suficientes datos)
        silhouette = silhouette_score(df_scaled, clusters) if len(df_scaled) > 1 else 0
        
        # Generar gráfica
        grafica = AnalisisService._generar_grafica_clustering(
            df_scaled,
            clusters,
            kmeans.cluster_centers_,
            variables
        )
        
        tiempo = int((time.time() - inicio) * 1000)
        
        return {
            'resultados': {
                'clusters': clusters.tolist(),
                'centroides': kmeans.cluster_centers_.tolist(),
                'inercia': float(kmeans.inertia_),
                'silhouette_score': float(silhouette),
                'n_clusters': n_clusters
            },
            'datos_grafica': {
                'datos': df_scaled.tolist(),
                'clusters': clusters.tolist(),
                'centroides': kmeans.cluster_centers_.tolist()
            },
            'grafica_principal': grafica,
            'tiempo_ejecucion_ms': tiempo
        }
    
    @staticmethod
    def _ejecutar_estadisticas(
        project_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Ejecuta análisis estadístico descriptivo
        """
        inicio = time.time()
        
        # Obtener datos
        df = AnalisisService._obtener_datos_proyecto(project_id, db)
        
        # Calcular estadísticas
        estadisticas = {}
        for col in df.columns:
            if col != 'fecha':
                estadisticas[col] = {
                    'media': float(df[col].mean()),
                    'mediana': float(df[col].median()),
                    'min': float(df[col].min()),
                    'max': float(df[col].max()),
                    'std': float(df[col].std()),
                    'q1': float(df[col].quantile(0.25)),
                    'q3': float(df[col].quantile(0.75))
                }
        
        tiempo = int((time.time() - inicio) * 1000)
        
        return {
            'resultados': estadisticas,
            'datos_grafica': {
                'columnas': list(estadisticas.keys()),
                'estadisticas': estadisticas
            },
            'tiempo_ejecucion_ms': tiempo
        }
    
    @staticmethod
    def _generar_grafica_pca(
        pca_result: np.ndarray,
        varianza: np.ndarray,
        variables: List[str]
    ) -> str:
        """
        Genera gráfica PCA
        """
        import io
        import base64
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # Gráfica de proyección
        ax1.scatter(pca_result[:, 0], pca_result[:, 1], alpha=0.7)
        ax1.set_xlabel('PC1')
        ax1.set_ylabel('PC2')
        ax1.set_title('Proyección PCA')
        ax1.grid(True, alpha=0.3)
        
        # Gráfica de varianza
        ax2.bar(range(1, len(varianza) + 1), varianza * 100)
        ax2.set_xlabel('Componente')
        ax2.set_ylabel('Varianza explicada (%)')
        ax2.set_title('Varianza por Componente')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Convertir a base64
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode()
        plt.close()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def _generar_grafica_regresion(
        y_real: np.ndarray,
        y_pred: np.ndarray,
        var_dependiente: str
    ) -> str:
        """
        Genera gráfica de regresión
        """
        import io
        import base64
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # Gráfica de predicción vs real
        ax1.scatter(y_real, y_pred, alpha=0.7)
        ax1.plot([y_real.min(), y_real.max()], [y_real.min(), y_real.max()], 'r--', lw=2)
        ax1.set_xlabel(f'{var_dependiente} Real')
        ax1.set_ylabel(f'{var_dependiente} Predicho')
        ax1.set_title('Predicción vs Real')
        ax1.grid(True, alpha=0.3)
        
        # Gráfica de residuos
        residuos = y_real - y_pred
        ax2.scatter(y_pred, residuos, alpha=0.7)
        ax2.axhline(y=0, color='r', linestyle='--', lw=2)
        ax2.set_xlabel('Valor Predicho')
        ax2.set_ylabel('Residuo')
        ax2.set_title('Gráfica de Residuos')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode()
        plt.close()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def _generar_grafica_clustering(
        datos: np.ndarray,
        clusters: np.ndarray,
        centroides: np.ndarray,
        variables: List[str]
    ) -> str:
        """
        Genera gráfica de clustering
        """
        import io
        import base64
        
        fig, ax = plt.subplots(figsize=(8, 6))
        
        # Colores por cluster
        colores = ['blue', 'green', 'red', 'purple', 'orange', 'brown']
        
        for i in range(max(clusters) + 1):
            mask = clusters == i
            ax.scatter(datos[mask, 0], datos[mask, 1], 
                      label=f'Cluster {i+1}', 
                      c=colores[i % len(colores)], 
                      alpha=0.7)
        
        # Centroides
        ax.scatter(centroides[:, 0], centroides[:, 1], 
                  c='black', marker='X', s=200, 
                  label='Centroides')
        
        ax.set_xlabel(variables[0])
        ax.set_ylabel(variables[1] if len(variables) > 1 else variables[0])
        ax.set_title('Clustering de Datos')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode()
        plt.close()
        
        return f"data:image/png;base64,{img_str}"