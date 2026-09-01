import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AssignProjectModal from '../components/AssignProjectModal';
import { Users, Mail, UserPlus, Trash2, Briefcase, X, Edit, FolderOpen, Search, Eye, EyeOff, Copy, Check, Filter } from 'lucide-react';
import './Employees.css';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [projects, setProjects] = useState([]); // Lista de proyectos
  const [selectedProjectId, setSelectedProjectId] = useState(''); // Filtro de proyecto
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
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
  const [isPasswordClosing, setIsPasswordClosing] = useState(false);

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirmClosing, setIsConfirmClosing] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // Modal de asignación de proyectos
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchProjects();
  }, []);

  // Filtrar empleados por búsqueda Y por proyecto
  useEffect(() => {
    let filtered = employees;

    // Filtrar por proyecto
    if (selectedProjectId) {
      filtered = filtered.filter(emp => 
        emp.projects && emp.projects.some(p => p.id === parseInt(selectedProjectId))
      );
    }

    // Filtrar por búsqueda
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        (emp.profession && emp.profession.toLowerCase().includes(term))
      );
    }

    setFilteredEmployees(filtered);
  }, [searchTerm, employees, selectedProjectId]);

  useEffect(() => {
    document.body.style.overflow = 'hidden'; // Siempre oculto, el scroll es interno
  }, []);

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
      setFilteredEmployees(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFormData({ name: '', email: '', profession: '' });
    setIsModalClosing(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      profession: emp.profession || ''
    });
    setIsModalClosing(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsModalClosing(false);
      setEditingEmployee(null);
    }, 300);
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
        handleCloseModal();
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
        handleCloseModal();
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

  const handleClosePasswordModal = () => {
    setIsPasswordClosing(true);
    setTimeout(() => {
      setShowPasswordModal(false);
      setIsPasswordClosing(false);
      setTempPassword(null);
      setShowPassword(false);
      setCopied(false);
    }, 300);
  };

  const handleDeleteClick = (id, name) => {
    setEmployeeToDelete({ id, name });
    setIsConfirmClosing(false);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    try {
      await api.delete(`/employees/${employeeToDelete.id}`);
      setMessage({ text: `Empleado ${employeeToDelete.name} eliminado`, type: 'success' });
      fetchEmployees();
    } catch (error) {
      setMessage({ text: error.response?.data?.detail || 'Error al eliminar', type: 'error' });
    } finally {
      handleCloseConfirmModal();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmClosing(true);
    setTimeout(() => {
      setShowConfirmModal(false);
      setIsConfirmClosing(false);
      setEmployeeToDelete(null);
    }, 300);
  };

  const handleAssignProjects = (employee) => {
    setSelectedEmployee(employee);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setMessage({ text: `Proyectos asignados exitosamente`, type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    fetchEmployees();
  };

  const getPastelColor = (name) => {
    const pastelColors = [
      '#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#f59e0b',
      '#a78bfa', '#f87171', '#22d3ee', '#f0abfc', '#86efac'
    ];
    const index = name.length % pastelColors.length;
    return pastelColors[index];
  };

  return (
    <>
      <Navbar />
      
      {/* ===== FONDO ULTRA LIGERO (ORBES AZULES) ===== */}
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

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

        {/* BUSCADOR Y FILTRO POR PROYECTO */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre, email o profesión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="search-clear"
                onClick={() => setSearchTerm('')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* FILTRO POR PROYECTO */}
          <div className="filter-wrapper">
            <Filter size={16} className="filter-icon" />
            <select
              className="filter-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">Todos los proyectos</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          <span className="search-count">
            {filteredEmployees.length} {filteredEmployees.length === 1 ? 'empleado' : 'empleados'}
          </span>
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
              <p>Cargando empleados...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="empty-state">
              {searchTerm || selectedProjectId ? (
                <>
                  <Search size={40} />
                  <p>No hay resultados</p>
                  <span>Cambia tu búsqueda o selecciona otro proyecto</span>
                </>
              ) : (
                <>
                  <Users size={40} />
                  <p>No hay empleados</p>
                  <span>Registra tu primer empleado</span>
                </>
              )}
            </div>
          ) : (
            <div className="employees-grid">
              {filteredEmployees.map((emp) => {
                const borderColor = getPastelColor(emp.name);
                return (
                  <div key={emp.id} className="employee-card" style={{ borderColor: borderColor }}>

                    <div className="employee-card-header">
                      <div className="employee-avatar" style={{ background: borderColor }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="employee-info">
                        <div className="employee-name">{emp.name}</div>
                        <div className="employee-email">
                          <Mail size={12} />
                          {emp.email}
                        </div>
                        <div className="employee-projects">
                          <Briefcase size={12} />
                          {emp.projects && emp.projects.length > 0 ? (
                            <span>{emp.projects.length} {emp.projects.length === 1 ? 'proyecto' : 'proyectos'}</span>
                          ) : (
                            <span>Sin proyectos</span>
                          )}
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
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className={`modal-overlay ${isModalClosing ? 'closing' : ''}`}>
          <div className={`modal-container ${isModalClosing ? 'closing' : ''}`}>
            
            <div className="modal-header">
              <h2>{editingEmployee ? 'Editar Empleado' : 'Registrar Empleado'}</h2>
              <button onClick={handleCloseModal} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                <div className="form-group-modal">
                  <label className="form-label-modal">Nombre completo</label>
                  <input
                    type="text"
                    required
                    className="modal-form-input"
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {!editingEmployee && (
                  <div className="form-group-modal">
                    <label className="form-label-modal">Correo electrónico</label>
                    <input
                      type="email"
                      required
                      className="modal-form-input"
                      placeholder="empleado@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group-modal">
                  <label className="form-label-modal">Profesión</label>
                  <input
                    type="text"
                    required
                    className="modal-form-input"
                    placeholder="Ej: Desarrollador"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleCloseModal} className="btn-modal-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-primary">
                  {editingEmployee ? 'Actualizar' : 'Guardar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className={`password-overlay ${isPasswordClosing ? 'closing' : ''}`}>
          <div className={`password-modal ${isPasswordClosing ? 'closing' : ''}`}>

            <div className="password-modal-header">
              <h3>Empleado creado</h3>
              <button onClick={handleClosePasswordModal} className="password-modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="password-modal-body">
              <div className="password-success-icon">
                <Check size={40} />
              </div>
              <p>Contraseña temporal:</p>

              <div className="password-box">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={tempPassword || ''}
                  readOnly
                  className="password-input-modal"
                  onCopy={(e) => e.preventDefault()}
                />

                <button 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="password-eye-btn"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                <button 
                  onClick={handleCopyPassword} 
                  className="password-copy-btn"
                  title="Copiar"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              {copied && <span className="copied-text">¡Copiado!</span>}

              <p className="password-warning">
                Guarda esta contraseña en un lugar seguro
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

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div className={`confirm-overlay ${isConfirmClosing ? 'closing' : ''}`}>
          <div className={`confirm-modal ${isConfirmClosing ? 'closing' : ''}`}>
            
            <div className="confirm-icon">
              <Trash2 size={40} />
            </div>
            
            <h3>¿Eliminar empleado?</h3>
            <p>
              ¿Estás seguro de que deseas eliminar a <strong>{employeeToDelete?.name}</strong>?
            </p>
            <p className="confirm-warning">
              Esta acción no se puede deshacer
            </p>
            
            <div className="confirm-buttons">
              <button className="confirm-btn-cancel" onClick={handleCloseConfirmModal}>
                Cancelar
              </button>
              <button className="confirm-btn-delete" onClick={confirmDelete}>
                Eliminar
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