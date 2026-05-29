import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Plus, Building2, Mail, Phone, Users, X } from 'lucide-react';
import './Clients.css';

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    rfc: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      setClients(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/clients/', formData);
      alert('Cliente creado exitosamente');
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', company: '', rfc: '' });
      fetchClients();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al crear cliente');
    }
  };

  return (
    <>
      <Navbar />
      <div className="clients-container">
        <div className="clients-header">
          <div className="clients-header-content">
            <div className="clients-title">
              <h1>Clientes</h1>
              <p>Gestiona tus clientes y empresas</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-new-client"
            >
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        <main className="clients-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando clientes...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Users className="w-8 h-8" />
              </div>
              <p className="empty-title">No hay clientes registrados</p>
              <p className="empty-subtitle">Crea tu primer cliente para comenzar</p>
            </div>
          ) : (
            <div className="clients-grid">
              {clients.map((client) => (
                <div key={client.id} className="client-card">
                  <div className="client-header">
                    <div className="client-avatar">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="client-info">
                      <div className="client-name">{client.name}</div>
                      {client.company && (
                        <div className="client-company">
                          <Building2 className="w-3 h-3" />
                          {client.company}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="client-details">
                    <div className="client-detail">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </div>
                    {client.phone && (
                      <div className="client-detail">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </div>
                    )}
                    {client.rfc && (
                      <div className="client-rfc">
                        RFC: {client.rfc}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Cliente</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-form-label">Nombre *</label>
                  <input
                    type="text"
                    required
                    className="modal-form-input"
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="modal-form-group">
                  <label className="modal-form-label">Email *</label>
                  <input
                    type="email"
                    required
                    className="modal-form-input"
                    placeholder="cliente@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                
                <div className="modal-form-group">
                  <label className="modal-form-label">Empresa</label>
                  <input
                    type="text"
                    className="modal-form-input"
                    placeholder="Nombre de la empresa"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                
                <div className="modal-form-group">
                  <label className="modal-form-label">Teléfono</label>
                  <input
                    type="text"
                    className="modal-form-input"
                    placeholder="555-123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                
                <div className="modal-form-group">
                  <label className="modal-form-label">RFC</label>
                  <input
                    type="text"
                    className="modal-form-input"
                    placeholder="XAXX010101000"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn-modal-primary">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-modal-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
