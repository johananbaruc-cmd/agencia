import React from 'react';

const ResumenProyecto = ({
  nombre,
  progress,
  status,
  total_empleados,
  tareas_completadas,
  tareas_pendientes
}) => {
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': '⏳ Pendiente',
      'in_progress': '🔄 En Progreso',
      'completed': '✅ Completado',
      'cancelled': '❌ Cancelado'
    };
    return texts[status] || status;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        📊 Resumen del Proyecto
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Proyecto</p>
          <p className="text-lg font-bold text-gray-800 truncate">{nombre}</p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Estado</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </span>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">👥 Empleados</p>
          <p className="text-2xl font-bold text-gray-800">{total_empleados || 0}</p>
        </div>

        <div className="p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-600 font-medium">📋 Tareas</p>
          <p className="text-lg font-bold text-gray-800">
            {tareas_completadas || 0} / {(tareas_completadas || 0) + (tareas_pendientes || 0)}
          </p>
          <p className="text-xs text-gray-500">
            {tareas_completadas || 0} completadas • {tareas_pendientes || 0} pendientes
          </p>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progreso</span>
          <span className="text-sm font-medium text-blue-600">{progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(progress || 0, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumenProyecto;