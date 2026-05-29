import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { 
  Users, 
  Plus, 
  Mail, 
  UserPlus, 
  Shield, 
  UserCheck,
  MoreVertical,
  UserCog,
  Trash2,
  Send,
  Briefcase,
  Camera,
  Wrench,
  Monitor,
  PenTool,
  Star
} from 'lucide-react';
import './Employees.css';

// Roles personalizados para agencias digitales
const AVAILABLE_ROLES = [
  { value: 'photographer', label: '📸 Fotógrafo', icon: Camera },
  { value: 'mechanic', label: '🔧 Mecánico', icon: Wrench },
  { value: 'manager', label: '📊 Manager', icon: Briefcase },
  { value: 'developer', label: '💻 Desarrollador', icon: Monitor },
  { value: 'designer', label: '🎨 Diseñador', icon: PenTool },
  { value: 'editor', label: '✏️ Editor', icon: PenTool },
  { value: 'coordinator', label: '📋 Coordinador', icon: Star },
  { value: 'employee', label: '👤 Empleado', icon: UserCheck },
];

const getRoleIcon = (role) => {
  const found = AVAILABLE_ROLES.find(r => r.value === role);
  if (found) return found.icon;
  return UserCheck;
};

const getRoleLabel = (role) => {
  const found = AVAILABLE_ROLES.find(r => r.value === role);
  return found ? found.label : role;
};

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'employee'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/users/');
      const filtered = response.data.filter(u => u.id !== user?.id);
      setEmployees(filtered);
    } catch (error) {
      console.error('Error fetching employees:', error);
      if (error.response?.status === 404) {
        // Endpoint no existe aún, mostrar datos mock para desarrollo
        setEmployees([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    
    try {
      // Guardar empleado en backend
      await api.post('/users/invite', {
        email: formData.email,
        name: formData.name,
        role: formData.role
      });
      
      alert(`✅ ${formData.name} ha sido registrado como ${getRoleLabel(formData.role)}`);
      setShowModal(false);
      setFormData({ email: '', name: '', role: 'employee' });
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(error.response?.data?.detail || 'Error al registrar empleado');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      try {
        await api.delete(`/users/${employeeId}`);
        alert('Empleado eliminado');
        fetchEmployees();
      } catch (error) {
        alert(error.response?.data?.detail || 'Error al eliminar empleado');
      }
    }
  };

  const handleChangeRole = async (employeeId, newRole) => {
    try {
      await api.patch(`/users/${employeeId}`, { role: newRole });
      alert(`Rol actualizado a ${getRoleLabel(newRole)}`);
      fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al cambiar rol');
    }
  };

  const getRoleBadgeClass = (role) => {
    const roleMap = {
      photographer: 'role-badge-photographer',
      mechanic: 'role-badge-mechanic',
      manager: 'role-badge-manager',
      developer: 'role-badge-developer',
      designer: 'role-badge-designer',
      editor: 'role-badge-editor',
      coordinator: 'role-badge-coordinator',
      admin: 'role-badge-admin',
      employee: 'role-badge-employee'
    };
    return roleMap[role] || 'role-badge-employee';
  };

  return (
    <>
      <Navbar />
      <div className="employees-container">
        <div className="employees-header">
          <div className="employees-header-content">
            <div className="employees-title">
              <h1>Equipo</h1>
              <p>Gestiona los miembros de tu agencia</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-invite"
            >
              <UserPlus className="w-4 h-4" />
              Registrar Empleado
            </button>
          </div>
        </div>

        <main className="employees-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando equipo...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Users className="w-8 h-8" />
              </div>
              <p className="empty-title">No hay miembros en el equipo</p>
              <p className="empty-subtitle">Registra a tus primeros empleados</p>
            </div>
          ) : (
            <div className="employees-grid">
              {employees.map((employee) => {
                const RoleIcon = getRoleIcon(employee.role);
                const roleLabel = getRoleLabel(employee.role);
                const badgeClass = getRoleBadgeClass(employee.role);
                
                return (
                  <div key={employee.id} className="employee-card">
                    <div className="employee-card-header">
                      <div className="employee-avatar">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="employee-info">
                        <div className="employee-name">{employee.name}</div>
                        <div className="employee-email">
                          <Mail className="w-3 h-3" />
                          {employee.email}
                        </div>
                      </div>
                      <div className="employee-actions">
                        <div className="dropdown">
                          <button className="dropdown-trigger">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="dropdown-menu">
                            <button 
                              className="dropdown-item"
                              onClick={() => handleChangeRole(
                                employee.id, 
                                employee.role === 'admin' ? 'employee' : 'admin'
                              )}
                            >
                              <UserCog className="w-4 h-4" />
                              Cambiar Rol
                            </button>
                            <button 
                              className="dropdown-item danger"
                              onClick={() => handleRemoveEmployee(employee.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="employee-card-footer">
                      <div className={`role-badge ${badgeClass}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleLabel}
                      </div>
                      <div className="employee-status">
                        <span className="status-dot active"></span>
                        Activo
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal de registro */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Nuevo Miembro</h2>
              <p className="modal-subtitle">Completa los datos del empleado</p>
            </div>
            <form onSubmit={handleInvite}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-form-label">Nombre completo *</label>
                  <input
                    type="text"
                    required
                    className="modal-form-input"
                    placeholder="Ej: Ana García"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="modal-form-group">
                  <label className="modal-form-label">Correo electrónico *</label>
                  <input
                    type="email"
                    required
                    className="modal-form-input"
                    placeholder="ana@tuagencia.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <p className="form-hint">
                    ⚠️ El empleado recibirá un link de acceso (próximamente)
                  </p>
                </div>
                
                <div className="modal-form-group">
                  <label className="modal-form-label">Rol / Puesto</label>
                  <select
                    className="modal-form-input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {AVAILABLE_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <p className="form-hint">
                    Define qué tipo de acceso tendrá el empleado
                  </p>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="submit" 
                  className="btn-modal-primary"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? (
                    <>
                      <div className="spinner-small"></div>
                      Registrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Registrar Empleado
                    </>
                  )}
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
