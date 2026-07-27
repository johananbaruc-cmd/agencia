import React, { useState } from 'react';

const VistaGraficas = ({ analisis }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  if (!analisis || analisis.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        📊 No hay análisis disponibles para este reporte.
      </div>
    );
  }

  const getIcon = (tipo) => {
    const icons = {
      'pca': '📉',
      'regresion': '📈',
      'clustering': '🎯',
      'estadisticas': '📊'
    };
    return icons[tipo] || '📊';
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
        {analisis.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setSelectedTab(index)}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedTab === index
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{getIcon(item.tipo_analisis)}</span>
            {item.nombre || item.tipo_analisis.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Contenido del análisis seleccionado */}
      <div className="mt-4">
        {analisis[selectedTab] && (
          <div>
            {/* Descripción */}
            {analisis[selectedTab].descripcion && (
              <p className="text-gray-600 mb-4">
                {analisis[selectedTab].descripcion}
              </p>
            )}

            {/* Gráfica principal */}
            {analisis[selectedTab].grafica_principal && (
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <img
                  src={analisis[selectedTab].grafica_principal}
                  alt="Gráfica de análisis"
                  className="w-full rounded-lg shadow-sm"
                />
              </div>
            )}

            {/* Gráficas adicionales */}
            {analisis[selectedTab].graficas_adicionales && 
             analisis[selectedTab].graficas_adicionales.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analisis[selectedTab].graficas_adicionales.map((grafica, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4">
                    <img
                      src={grafica}
                      alt={`Gráfica adicional ${idx + 1}`}
                      className="w-full rounded-lg shadow-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Resultados en texto (formateados) */}
            {analisis[selectedTab].resultados && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">
                  📋 Resultados del Análisis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(analisis[selectedTab].resultados).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-white rounded border border-gray-100">
                      <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium text-gray-800">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VistaGraficas;