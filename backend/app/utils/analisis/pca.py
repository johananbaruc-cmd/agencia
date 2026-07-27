import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from typing import Dict, Any, List, Optional
import time


class PCAnalisis:
    """Análisis de Componentes Principales"""
    
    @staticmethod
    def ejecutar(
        datos: pd.DataFrame,
        variables: List[str],
        n_componentes: int = 2,
        escalar: bool = True
    ) -> Dict[str, Any]:
        """
        Ejecuta análisis PCA
        """
        inicio = time.time()
        
        # Seleccionar variables
        df_vars = datos[variables].copy()
        
        # Manejar valores nulos
        df_vars = df_vars.fillna(df_vars.mean())
        
        # Escalar datos
        if escalar:
            scaler = StandardScaler()
            df_scaled = scaler.fit_transform(df_vars)
        else:
            df_scaled = df_vars.values
        
        # Ejecutar PCA
        n_comp = min(n_componentes, len(df_scaled[0]))
        pca = PCA(n_components=n_comp)
        pca_result = pca.fit_transform(df_scaled)
        
        # Calcular componentes
        componentes = {}
        for i, var in enumerate(variables):
            componentes[var] = {
                f'PC{j+1}': float(pca.components_[j][i]) 
                for j in range(pca.n_components_)
            }
        
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
                'varianza': pca.explained_variance_ratio_.tolist(),
                'labels': variables
            },
            'tiempo_ejecucion_ms': tiempo
        }