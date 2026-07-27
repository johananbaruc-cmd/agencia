import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from typing import Dict, Any, List, Optional
import time


class ClusteringAnalisis:
    """Análisis de Clustering (K-means)"""
    
    @staticmethod
    def ejecutar(
        datos: pd.DataFrame,
        variables: List[str],
        n_clusters: int = 3,
        random_state: int = 42
    ) -> Dict[str, Any]:
        """
        Ejecuta análisis de clustering
        """
        inicio = time.time()
        
        # Seleccionar variables
        df_vars = datos[variables].copy()
        
        # Manejar valores nulos
        df_vars = df_vars.fillna(df_vars.mean())
        
        # Escalar
        scaler = StandardScaler()
        df_scaled = scaler.fit_transform(df_vars)
        
        # Ejecutar K-means
        kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
        clusters = kmeans.fit_predict(df_scaled)
        
        # Calcular silhouette score
        try:
            silhouette = silhouette_score(df_scaled, clusters)
        except:
            silhouette = 0
        
        tiempo = int((time.time() - inicio) * 1000)
        
        return {
            'resultados': {
                'clusters': clusters.tolist(),
                'centroides': kmeans.cluster_centers_.tolist(),
                'inercia': float(kmeans.inertia_),
                'silhouette_score': float(silhouette),
                'n_clusters': n_clusters,
                'n_muestras': len(df_scaled)
            },
            'datos_grafica': {
                'datos': df_scaled.tolist(),
                'clusters': clusters.tolist(),
                'centroides': kmeans.cluster_centers_.tolist(),
                'labels': variables
            },
            'tiempo_ejecucion_ms': tiempo
        }