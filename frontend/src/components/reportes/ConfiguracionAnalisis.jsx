import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ConfiguracionAnalisis = ({ configuracion, setConfiguracion }) => {
  const [expandido, setExpandido] = useState(false);

  const handleToggle = (tipo) => {
    setConfiguracion(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  const opciones = [
    { id: 'pca', label: '📉 PCA', desc: 'Reducción de dimensionalidad' },
    { id: 'regresion', label: '📈 Regresión Lineal', desc: 'Predicción de tendencias' },
    { id: 'clustering', label: '🎯 Clustering', desc: 'Agrupación de datos' },
    { id: 'estadisticas', label: '📊 Estadísticas', desc: 'Análisis descriptivo' },
  ];

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-semibold text-gray-700">
          📊 Configuración de Análisis
        </span>
        {expandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expandido && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {opciones.map((opcion) => (
            <label
              key={opcion.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                configuracion[opcion.id]
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={configuracion[opcion.id] || false}
                onChange={() => handleToggle(opcion.id)}
                className="mt-1 w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <p className="font-medium text-gray-700">{opcion.label}</p>
                <p className="text-xs text-gray-500">{opcion.desc}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConfiguracionAnalisis;