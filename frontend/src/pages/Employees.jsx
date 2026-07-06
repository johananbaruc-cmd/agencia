import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AssignProjectModal from '../components/AssignProjectModal';
import { Users, Mail, UserPlus, Trash2, Briefcase, X, Edit, Eye, EyeOff, Copy, Check, FolderOpen } from 'lucide-react';
import './Employees.css';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profession: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  // PASSWORD
  const [tempPassword, setTempPassword] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Modal de confirmación personalizado para eliminar
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // Modal de asignación de proyectos
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Bloquear scroll cuando modal está abierto
  useEffect(() => {
    document.body.style.overflow = (showPasswordModal || showConfirmModal || showAssignModal) ? 'hidden' : 'auto';
  }, [showPasswordModal, showConfirmModal, showAssignModal]);

  // Ocultar password si cambian de ventana
  useEffect(() => {
    const handleBlur = () => setShowPassword(false);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/');
      const filtered = response.data.filter(emp => emp.role === 'employee');
      setEmployees(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFormData({ name: '', email: '', profession: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      profession: emp.profession || ''
    });
    setShowModal(true);
  };

  const handleCopyPassword = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, {
          name: formData.name,
          profession: formData.profession.trim()
        });

        setMessage({ text: `Empleado actualizado`, type: 'success' });
        setShowModal(false);
      } else {
        const response = await api.post('/employees/', {
          name: formData.name,
          email: formData.email,
          role: 'employee',
          profession: formData.profession.trim()
        });

        setTempPassword(response.data.temporary_password);
        setShowPassword(false);
        setShowPasswordModal(true);
      }

      setFormData({ name: '', email: '', profession: '' });
      fetchEmployees();

    } catch (error) {
      setMessage({
        text: error.response?.data?.detail || 'Error',
        type: 'error'
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setTempPassword(null);
    setShowPassword(false);
    setCopied(false);
  };

  // Abre el modal de confirmación para eliminar
  const handleDeleteClick = (id, name) => {
    setEmployeeToDelete({ id, name });
    setShowConfirmModal(true);
  };

  // Elimina después de confirmar
  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    try {
      await api.delete(`/employees/${employeeToDelete.id}`);
      setMessage({ text: `Empleado ${employeeToDelete.name} eliminado`, type: 'success' });
      fetchEmployees();
    } catch (error) {
      setMessage({ text: error.response?.data?.detail || 'Error al eliminar', type: 'error' });
    } finally {
      setShowConfirmModal(false);
      setEmployeeToDelete(null);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  // Abrir modal de asignación de proyectos
  const handleAssignProjects = (employee) => {
    setSelectedEmployee(employee);
    setShowAssignModal(true);
  };

  // Manejar asignación exitosa
  const handleAssignSuccess = () => {
    setMessage({ text: `Proyectos asignados exitosamente`, type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    fetchEmployees();
  };

  return (
    <>
      <Navbar />

      <div className="employees-container">

        {/* HEADER */}
        <div className="employees-header">
          <div className="employees-header-content">
            <div>
              <h1>Equipo</h1>
              <p>Gestiona los empleados</p>
            </div>

            <button onClick={handleOpenCreateModal} className="btn-invite">
              <UserPlus size={16} />
              Registrar
            </button>
          </div>
        </div>

        {/* MENSAJE */}
        {message.text && (
          <div className={`message-floating ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* MAIN */}
        <main className="employees-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <Users size={40} />
              <p>No hay empleados</p>
            </div>
          ) : (
            <div className="employees-grid">
              {employees.map((emp) => (
                <div key={emp.id} className="employee-card">

                  <div className="employee-card-header">
                    <div className="employee-avatar">
                      {emp.name.charAt(0)}
                    </div>

                    <div>
                      <div className="employee-name">{emp.name}</div>
                      <div className="employee-email">
                        <Mail size={12} />
                        {emp.email}
                      </div>
                    </div>

                    <div className="employee-actions">
                      <button 
                        className="assign-btn"
                        onClick={() => handleAssignProjects(emp)}
                        title="Asignar proyectos"
                      >
                        <FolderOpen size={14} />
                      </button>
                      <button className="edit-btn" onClick={() => handleOpenEditModal(emp)}>
                        <Edit size={14} />
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteClick(emp.id, emp.name)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="employee-card-footer">
                    <div className="role-badge">
                      <Briefcase size={12} />
                      {emp.profession || 'Sin profesión'}
                    </div>

                    <div className="employee-status">
                      <span className="status-dot active"></span>
                      Activo
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">

            <div className="modal-header">
              <h2>{editingEmployee ? 'Editar' : 'Registrar'}</h2>
              <button onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                <input
                  type="text"
                  required
                  className="modal-form-input"
                  placeholder="Nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                {!editingEmployee && (
                  <input
                    type="email"
                    required
                    className="modal-form-input"
                    placeholder="Correo"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                )}

                <input
                  type="text"
                  required
                  className="modal-form-input"
                  placeholder="Profesión"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                />

              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-modal-primary">
                  Guardar
                </button>
                <button type="button" onClick={handleCloseModal} className="btn-modal-secondary">
                  Cancelar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="password-overlay">

          <div className="password-modal">

            <div className="password-modal-header">
              <h3>Empleado creado</h3>
            </div>

            <div className="password-modal-body">

              <p>Contraseña temporal:</p>

              <div className="password-box">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={tempPassword || ''}
                  readOnly
                  className="password-input-modal"
                  onCopy={(e) => e.preventDefault()}
                />

                <button onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                <button onClick={handleCopyPassword}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              {copied && <span className="copied-text">Copiado</span>}

              <p className="password-warning">
                Guarda esta contraseña
              </p>

            </div>

            <div className="password-modal-footer">
              <button onClick={handleClosePasswordModal} className="password-ok-btn">
                Entendido
              </button>
            </div>

          </div>

        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {showConfirmModal && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro de que deseas eliminar a <strong>{employeeToDelete?.name}</strong>?</p>
            <div className="confirm-buttons">
              <button className="confirm-btn-delete" onClick={confirmDelete}>
                Eliminar
              </button>
              <button className="confirm-btn-cancel" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ASIGNACIÓN DE PROYECTOS */}
      {showAssignModal && selectedEmployee && (
        <AssignProjectModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onAssign={handleAssignSuccess}
        />
      )}
    </>
  );
}