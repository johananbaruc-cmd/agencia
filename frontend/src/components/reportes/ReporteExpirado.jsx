import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReporteExpirado = ({ token }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">⏰</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Reporte Expirado
        </h1>
        <p className="text-gray-600 mb-6">
          Este reporte ha expirado. El acceso solo está disponible durante 
          <strong className="text-blue-600"> 1 hora</strong> después de la primera apertura.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-800 mb-2">📌 ¿Qué puedes hacer?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Contacta con el administrador del proyecto</li>
            <li>• Solicita un nuevo código de acceso</li>
            <li>• El administrador puede regenerar el reporte</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/acceso/reporte/${token}`)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            🔄 Solicitar nuevo acceso
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition"
          >
            🏠 Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReporteExpirado;