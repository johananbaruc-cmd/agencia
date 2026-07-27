import io
import base64
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from typing import List, Optional, Dict, Any
import matplotlib
matplotlib.use('Agg')  # Para entornos sin GUI


class Visualizacion:
    """Generación de gráficas para análisis"""
    
    @staticmethod
    def generar_grafica_pca(
        pca_result: np.ndarray,
        varianza: np.ndarray,
        labels: List[str],
        titulo: str = "Análisis PCA"
    ) -> str:
        """
        Genera gráfica PCA con proyección y varianza
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # Gráfica de proyección
        ax1.scatter(pca_result[:, 0], pca_result[:, 1], alpha=0.7, c='blue')
        ax1.set_xlabel('PC1')
        ax1.set_ylabel('PC2')
        ax1.set_title(f'{titulo} - Proyección')
        ax1.grid(True, alpha=0.3)
        
        # Gráfica de varianza
        n_comp = len(varianza)
        ax2.bar(range(1, n_comp + 1), varianza * 100, color='green', alpha=0.7)
        ax2.set_xlabel('Componente')
        ax2.set_ylabel('Varianza explicada (%)')
        ax2.set_title('Varianza por Componente')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return Visualizacion._figura_a_base64(fig)
    
    @staticmethod
    def generar_grafica_regresion(
        y_real: np.ndarray,
        y_pred: np.ndarray,
        var_dependiente: str,
        titulo: str = "Regresión Lineal"
    ) -> str:
        """
        Genera gráfica de regresión con predicción vs real y residuos
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # Gráfica de predicción vs real
        ax1.scatter(y_real, y_pred, alpha=0.7, c='blue')
        min_val = min(y_real.min(), y_pred.min())
        max_val = max(y_real.max(), y_pred.max())
        ax1.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2)
        ax1.set_xlabel(f'{var_dependiente} Real')
        ax1.set_ylabel(f'{var_dependiente} Predicho')
        ax1.set_title(f'{titulo} - Predicción vs Real')
        ax1.grid(True, alpha=0.3)
        
        # Gráfica de residuos
        residuos = y_real - y_pred
        ax2.scatter(y_pred, residuos, alpha=0.7, c='green')
        ax2.axhline(y=0, color='r', linestyle='--', lw=2)
        ax2.set_xlabel('Valor Predicho')
        ax2.set_ylabel('Residuo')
        ax2.set_title('Gráfica de Residuos')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return Visualizacion._figura_a_base64(fig)
    
    @staticmethod
    def generar_grafica_clustering(
        datos: np.ndarray,
        clusters: np.ndarray,
        centroides: np.ndarray,
        labels: List[str],
        titulo: str = "Clustering"
    ) -> str:
        """
        Genera gráfica de clustering
        """
        fig, ax = plt.subplots(figsize=(8, 6))
        
        # Colores por cluster
        colores = ['blue', 'green', 'red', 'purple', 'orange', 'brown', 'pink', 'gray']
        
        n_clusters = len(np.unique(clusters))
        
        for i in range(n_clusters):
            mask = clusters == i
            ax.scatter(
                datos[mask, 0], 
                datos[mask, 1] if datos.shape[1] > 1 else np.zeros_like(datos[mask, 0]),
                label=f'Cluster {i+1}',
                c=colores[i % len(colores)],
                alpha=0.7
            )
        
        # Centroides
        if centroides.shape[1] > 1:
            ax.scatter(
                centroides[:, 0], 
                centroides[:, 1],
                c='black', 
                marker='X', 
                s=200,
                label='Centroides'
            )
        
        ax.set_xlabel(labels[0])
        ax.set_ylabel(labels[1] if len(labels) > 1 else labels[0])
        ax.set_title(f'{titulo} - Agrupación de Datos')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return Visualizacion._figura_a_base64(fig)
    
    @staticmethod
    def generar_grafica_estadisticas(
        estadisticas: Dict[str, Dict[str, float]],
        titulo: str = "Estadísticas Descriptivas"
    ) -> str:
        """
        Genera gráfica de estadísticas descriptivas
        """
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Preparar datos
        vars_list = list(estadisticas.keys())
        medias = [estadisticas[v].get('media', 0) for v in vars_list]
        stds = [estadisticas[v].get('std', 0) for v in vars_list]
        
        # Barras con error
        ax.bar(vars_list, medias, yerr=stds, capsize=5, alpha=0.7, color='blue')
        ax.set_xlabel('Variables')
        ax.set_ylabel('Valor')
        ax.set_title(titulo)
        ax.grid(True, alpha=0.3)
        
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        return Visualizacion._figura_a_base64(fig)
    
    @staticmethod
    def _figura_a_base64(fig) -> str:
        """
        Convierte una figura de matplotlib a base64
        """
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode()
        plt.close(fig)
        return f"data:image/png;base64,{img_str}"