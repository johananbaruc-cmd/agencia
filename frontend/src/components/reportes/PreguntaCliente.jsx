import React, { useState } from 'react';
import  api  from '../../services/api';

const PreguntaCliente = ({ pregunta, reporteId, token }) => {
  const [respuesta, setRespuesta] = useState('');
  const [respuestaBoolean, setRespuestaBoolean] = useState(null);
  const [comentarios, setComentarios] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const codigo = sessionStorage.getItem('codigo_acceso');
      
      await api.post(`/public/reportes/${token}/interactuar`, {
        respuesta_pregunta: respuesta,
        respuesta_boolean: respuestaBoolean,
        comentarios: comentarios
      }, {
        headers: {
          'X-Codigo-Acceso': codigo
        }
      });

      setEnviado(true);
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      setError('Error al enviar tu respuesta. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-green-500 text-5xl mb-2">✅</div>
        <h3 className="text-lg font-semibold text-green-800">
          ¡Respuesta enviada!
        </h3>
        <p className="text-green-600">
          Gracias por tu respuesta. El administrador la recibirá.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        ❓ Pregunta del Administrador
      </h2>
      
      <p className="text-gray-700 mb-6 text-lg bg-blue-50 p-4 rounded-lg border border-blue-100">
        {pregunta}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Respuesta tipo texto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tu respuesta:
          </label>
          <textarea
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Escribe tu respuesta aquí..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Respuesta tipo booleano (Sí/No) */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Respuesta rápida (opcional):
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRespuestaBoolean(true)}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                respuestaBoolean === true
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Sí
            </button>
            <button
              type="button"
              onClick={() => setRespuestaBoolean(false)}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                respuestaBoolean === false
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ No
            </button>
            {respuestaBoolean !== null && (
              <button
                type="button"
                onClick={() => setRespuestaBoolean(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Comentarios adicionales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentarios adicionales:
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Agrega cualquier comentario adicional..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Enviando...
            </>
          ) : (
            '📨 Enviar Respuesta'
          )}
        </button>
      </form>
    </div>
  );
};

export default PreguntaCliente;