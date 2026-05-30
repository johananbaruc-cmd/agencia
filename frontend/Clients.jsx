import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Plus, Building2, Mail, Phone, Users, Trash2, Edit, X } from 'lucide-react';
import './Clients.css';

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    rfc: ''
  });
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', company: '', rfc: '' });
    setEditingClient(null);
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        company: client.company || '',
        rfc: client.rfc || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        setSuccessMessage('Cliente actualizado exitosamente');
      } else {
        await api.post('/clients/', formData);
        setSuccessMessage('Cliente creado exitosamente');
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowModal(false);
      resetForm();
      fetchClients();
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Error al guardar cliente');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDelete = async (clientId, clientName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${clientName}"?`)) {
      return;
    }
    
    setDeletingId(clientId);
    try {
      await api.delete(`/clients/${clientId}`);
      setSuccessMessage(`Cliente "${clientName}" eliminado exitosamente`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchClients();
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      setErrorMessage(errorDetail || 'Error al eliminar el cliente');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDeletingId(null);
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
            <button onClick={() => handleOpenModal()} className="btn-new-client">
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {successMessage && <div className="success-message">✅ {successMessage}</div>}
        {errorMessage && <div className="error-message">❌ {errorMessage}</div>}

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
                  <div className="client-actions">
                    <button className="client-edit-btn" onClick={() => handleOpenModal(client)}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      className="client-delete-btn" 
                      onClick={() => handleDelete(client.id, client.name)}
                      disabled={deletingId === client.id}
                    >
                      {deletingId === client.id ? <div className="delete-spinner-small"></div> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="client-header">
                    <div className="client-avatar">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="client-info">
                      <div className="client-name">{client.name}</div>
                      {client.company && <div className="client-company">{client.company}</div>}
                    </div>
                  </div>
                  <div className="client-details">
                    <div className="client-detail"><Mail className="w-3 h-3" /> {client.email}</div>
                    {client.phone && <div className="client-detail"><Phone className="w-3 h-3" /> {client.phone}</div>}
                    {client.rfc && <div className="client-rfc">RFC: {client.rfc}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal flotante para crear/editar cliente */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-form-label">Nombre *</label>
                  <input type="text" required className="modal-form-input" placeholder="Ej: Juan Pérez" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="modal-form-group">
                  <label className="modal-form-label">Email *</label>
                  <input type="email" required className="modal-form-input" placeholder="cliente@empresa.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="modal-form-group">
                  <label className="modal-form-label">Empresa</label>
                  <input type="text" className="modal-form-input" placeholder="Nombre de la empresa" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                </div>
                <div className="modal-form-group">
                  <label className="modal-form-label">Teléfono</label>
                  <input type="tel" className="modal-form-input" placeholder="555-123-4567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="modal-form-group">
                  <label className="modal-form-label">RFC</label>
                  <input type="text" className="modal-form-input" placeholder="XAXX010101000" value={formData.rfc} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-modal-primary">{editingClient ? 'Actualizar' : 'Guardar'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-modal-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
