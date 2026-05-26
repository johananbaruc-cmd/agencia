import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

export default function ProjectsNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    client_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      console.log('Clientes:', response.data);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validaciones
    if (!formData.name.trim()) {
      setError('El nombre del proyecto es requerido');
      setLoading(false);
      return;
    }
    
    if (!formData.client_id) {
      setError('Debes seleccionar un cliente');
      setLoading(false);
      return;
    }
    
    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      setError('El presupuesto debe ser mayor a 0');
      setLoading(false);
      return;
    }
    
    // Construir datos EXACTAMENTE como Swagger
    const projectData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || "",
      budget: Number(formData.budget),
      client_id: Number(formData.client_id),
      start_date: null,  // Enviar null en lugar de string vacío
      end_date: null     // Enviar null en lugar de string vacío
    };
    
    console.log('Enviando a API:', JSON.stringify(projectData, null, 2));
    
    try {
      const response = await api.post('/projects/', projectData);
      console.log('Respuesta:', response.data);
      alert('✅ Proyecto creado exitosamente');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error respuesta:', error.response?.data);
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          const messages = detail.map(d => `${d.loc?.join('.')}: ${d.msg}`).join('\n');
          setError(messages);
        } else {
          setError(detail);
        }
      } else {
        setError('Error al crear proyecto');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Crear Nuevo Proyecto
            </h1>
            
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 whitespace-pre-wrap text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del proyecto *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Rediseño Web"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.company ? `- ${client.company}` : ''}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-amber-600 text-sm mt-1">
                    ⚠️ No hay clientes. Crea uno primero en la página de Clientes.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presupuesto (MXN) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe el alcance del proyecto..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Proyecto'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
