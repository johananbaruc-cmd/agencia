import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error
from typing import Dict, Any, List, Optional
import time


class RegresionAnalisis:
    """Análisis de Regresión Lineal"""
    
    @staticmethod
    def ejecutar(
        datos: pd.DataFrame,
        var_dependiente: str,
        vars_independientes: List[str],
        test_size: float = 0.2
    ) -> Dict[str, Any]:
        """
        Ejecuta análisis de regresión lineal
        """
        inicio = time.time()
        
        # Preparar datos
        X = datos[vars_independientes].values
        y = datos[var_dependiente].values
        
        # Manejar valores nulos
        X = np.nan_to_num(X, nan=0)
        y = np.nan_to_num(y, nan=0)
        
        # Dividir datos
        n = len(X)
        split_idx = int(n * (1 - test_size))
        
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
        r2_train = r2_score(y_train, y_pred_train)
        
        # Coeficientes
        coeficientes = dict(zip(vars_independientes, model.coef_.tolist()))
        
        tiempo = int((time.time() - inicio) * 1000)
        
        return {
            'resultados': {
                'coeficientes': coeficientes,
                'intercepto': float(model.intercept_),
                'r2_score': float(r2),
                'r2_entrenamiento': float(r2_train),
                'mse': float(mse),
                'n_muestras': n
            },
            'datos_grafica': {
                'reales': y_test.tolist(),
                'predichos': y_pred.tolist()
            },
            'tiempo_ejecucion_ms': tiempo
        }