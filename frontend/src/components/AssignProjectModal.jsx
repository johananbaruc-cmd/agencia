import { useState, useEffect } from 'react';
import { X, Check, FolderOpen, Plus, Clock, CheckCircle, AlertCircle, Trash2, Save, Users, FileText, Calendar } from 'lucide-react';
import api from '../services/api';
import './AssignProjectModal.css';

export default function AssignProjectModal({ 
  isOpen, 
  onClose, 
  employee,
  onAssign 
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [expandedProject, setExpandedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState({});
  const [loadingTasks, setLoadingTasks] = useState({});
  const [showTaskForm, setShowTaskForm] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [activeTab, setActiveTab] = useState('assign');

  useEffect(() => {
    if (isOpen && employee) {
      fetchProjects();
      fetchEmployeeProjects();
    }
  }, [isOpen, employee]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
      setMessage({ text: 'Error al cargar proyectos', type: 'error' });
    }
  };

  const fetchEmployeeProjects = async () => {
    try {
      const projectsResponse = await api.get('/projects/');
      const allProjects = projectsResponse.data;
      
      const projectsWithMembership = await Promise.all(
        allProjects.map(async (project) => {
          try {
            const membersResponse = await api.get(`/projects/${project.id}/members`);
            const members = membersResponse.data;
            const isMember = members.some(m => m.user_id === employee.id || m.id === employee.id);
            return { ...project, isMember };
          } catch (error) {
            return { ...project, isMember: false };
          }
        })
      );

      const assigned = projectsWithMembership.filter(p => p.isMember);
      setAssignedProjects(assigned);
      
      const assignedIds = assigned.map(p => p.id);
      setSelectedProjects(assignedIds);
      
    } catch (error) {
      console.error('Error cargando proyectos del empleado:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (projectId) => {
    if (projectTasks[projectId]) return;
    
    setLoadingTasks(prev => ({ ...prev, [projectId]: true }));
    try {
      const response = await api.get(`/tasks/projects/${projectId}/tasks`);
      setProjectTasks(prev => ({ ...prev, [projectId]: response.data }));
    } catch (error) {
      console.error('Error cargando tareas:', error);
      setProjectTasks(prev => ({ ...prev, [projectId]: [] }));
    } finally {
      setLoadingTasks(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleCreateTask = async (projectId) => {
    if (!newTask.title.trim()) {
      setMessage({ text: 'El título de la tarea es requerido', type: 'error' });
      return;
    }

    setCreatingTask(true);
    try {
      const response = await api.post('/tasks/', {
        title: newTask.title.trim(),
        description: newTask.description?.trim() || '',
        priority: newTask.priority,
        status: 'pending',
        project_id: projectId,
        assigned_to: employee.id,
        due_date: newTask.due_date || null
      });

      setProjectTasks(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), response.data]
      }));

      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowTaskForm(null);
      setMessage({ text: '✅ Tarea creada exitosamente', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } catch (error) {
      console.error('Error creando tarea:', error);
      setMessage({ 
        text: error.response?.data?.detail || '❌ Error al crear tarea', 
        type: 'error' 
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId, projectId) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    
    try {
      await api.delete(`/tasks/${taskId}`);
      setProjectTasks(prev => ({
        ...prev,
        [projectId]: prev[projectId].filter(task => task.id !== taskId)
      }));
      setMessage({ text: '✅ Tarea eliminada', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      setMessage({ text: '❌ Error al eliminar tarea', type: 'error' });
    }
  };

  const handleToggleProject = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  const handleExpandProject = (projectId) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      setShowTaskForm(null);
    } else {
      setExpandedProject(projectId);
      fetchProjectTasks(projectId);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const currentAssignedIds = assignedProjects.map(p => p.id);
      const toAdd = selectedProjects.filter(id => !currentAssignedIds.includes(id));
      const toRemove = currentAssignedIds.filter(id => !selectedProjects.includes(id));

      for (const projectId of toAdd) {
        await api.post(`/projects/${projectId}/members`, { user_id: employee.id });
      }

      for (const projectId of toRemove) {
        await api.delete(`/projects/${projectId}/members/${employee.id}`);
      }

      const updatedAssigned = projects.filter(p => selectedProjects.includes(p.id));
      setAssignedProjects(updatedAssigned);

      setMessage({ 
        text: `✅ Proyectos asignados exitosamente a ${employee.name}`, 
        type: 'success' 
      });

      setTimeout(() => {
        if (onAssign) onAssign();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error al asignar:', error);
      setMessage({ 
        text: error.response?.data?.detail || '❌ Error al asignar proyectos', 
        type: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusText = (status) => {
    const map = { pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completado', cancelled: 'Cancelado' };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = { pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981', cancelled: '#ef4444' };
    return map[status] || '#6b7280';
  };

  const getTaskStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
    if (status === 'in_progress') return <Clock size={14} style={{ color: '#3b82f6' }} />;
    return <AlertCircle size={14} style={{ color: '#f59e0b' }} />;
  };

  const getTaskStatusLabel = (status) => {
    const map = { pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Finalizado' };
    return map[status] || status;
  };

  const getPriorityColor = (priority) => {
    const map = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626' };
    return map[priority] || '#6b7280';
  };

  const getPriorityLabel = (priority) => {
    const map = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
    return map[priority] || priority;
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="assign-modal-overlay" onClick={onClose}>
      <div className="assign-modal-container" onClick={(e) => e.stopPropagation()}>

        <div className="assign-modal-header">
          <h2>Gestionar Proyectos</h2>
          <button className="assign-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="assign-modal-body">
          {/* Info del empleado */}
          <div className="employee-info-card">
            <div className="employee-avatar-small">
              {employee.name?.charAt(0) || 'E'}
            </div>
            <div className="employee-info-text">
              <div className="employee-name-modal">{employee.name}</div>
              <div className="employee-email-modal">{employee.email}</div>
              <div className="employee-profession">{employee.profession || 'Sin profesión'}</div>
            </div>
          </div>

          {/* Mensaje */}
          {message.text && (
            <div className={`assign-message ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Pestañas */}
          <div className="assign-tabs">
            <button
              onClick={() => setActiveTab('assign')}
              className={`assign-tab ${activeTab === 'assign' ? 'active' : ''}`}
            >
              <Users size={16} />
              Asignar Proyectos
              <span className="assign-tab-badge">{projects.length}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('tasks');
                assignedProjects.forEach(p => fetchProjectTasks(p.id));
              }}
              className={`assign-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            >
              <FileText size={16} />
              Gestionar Tareas
              <span className="assign-tab-badge">{assignedProjects.length}</span>
            </button>
          </div>

          {/* Pestaña Asignar */}
          {activeTab === 'assign' && (
            <>
              <div className="assign-header-info">
                <span>Proyectos disponibles</span>
                <span>Seleccionados: {selectedProjects.length}</span>
              </div>

              {loading ? (
                <div className="assign-loading">
                  <div className="loading-spinner-small"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="assign-empty">
                  <FolderOpen size={32} />
                  <p>No hay proyectos disponibles</p>
                </div>
              ) : (
                <div className="assign-project-list">
                  {projects.map((project) => {
                    const isSelected = selectedProjects.includes(project.id);
                    return (
                      <div
                        key={project.id}
                        onClick={() => handleToggleProject(project.id)}
                        className={`assign-project-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="assign-project-icon">
                          <FolderOpen size={16} />
                        </div>
                        <div className="assign-project-info">
                          <div className="assign-project-name">{project.name}</div>
                          <div className="assign-project-meta">
                            <span>Cliente: {project.client_name || 'Sin cliente'}</span>
                            <span className="assign-dot">•</span>
                            <span style={{ color: getStatusColor(project.status) }}>
                              {getStatusText(project.status)}
                            </span>
                          </div>
                        </div>
                        <div className={`assign-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Pestaña Tareas */}
          {activeTab === 'tasks' && (
            <>
              {assignedProjects.length === 0 ? (
                <div className="assign-empty">
                  <FileText size={32} />
                  <p>No hay proyectos asignados</p>
                  <span>Asigna proyectos primero</span>
                </div>
              ) : (
                <div className="assign-task-list">
                  {assignedProjects.map((project) => {
                    const isExpanded = expandedProject === project.id;
                    const tasks = projectTasks[project.id] || [];
                    const isLoadingTasks = loadingTasks[project.id];
                    const isTaskFormVisible = showTaskForm === project.id;
                    
                    return (
                      <div key={project.id} className="assign-task-group">
                        <div
                          onClick={() => handleExpandProject(project.id)}
                          className={`assign-task-project ${isExpanded ? 'expanded' : ''}`}
                        >
                          <div className="assign-project-icon">
                            <FolderOpen size={16} />
                          </div>
                          <div className="assign-project-info">
                            <div className="assign-project-name">{project.name}</div>
                            <div className="assign-project-meta">
                              <span>Tareas: {tasks.length}</span>
                            </div>
                          </div>
                          <div className="assign-expand-icon">
                            {isExpanded ? '▲' : '▼'}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="assign-task-sub">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTaskForm(isTaskFormVisible ? null : project.id);
                                setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
                              }}
                              className="assign-add-task-btn"
                            >
                              <Plus size={14} />
                              Nueva Tarea
                            </button>

                            {isTaskFormVisible && (
                              <div className="assign-task-form">
                                <input
                                  type="text"
                                  placeholder="Título de la tarea *"
                                  value={newTask.title}
                                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                  className="assign-task-input"
                                />
                                <textarea
                                  placeholder="Descripción (opcional)"
                                  value={newTask.description}
                                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                  className="assign-task-textarea"
                                  rows="2"
                                />
                                <div className="assign-task-form-row">
                                  <select
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                    className="assign-task-select"
                                  >
                                    <option value="low">🟢 Baja</option>
                                    <option value="medium">🟡 Media</option>
                                    <option value="high">🟠 Alta</option>
                                    <option value="urgent">🔴 Urgente</option>
                                  </select>
                                  <div className="assign-task-date">
                                    <Calendar size={14} />
                                    <input
                                      type="date"
                                      value={newTask.due_date}
                                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                      className="assign-task-date-input"
                                    />
                                  </div>
                                  <span className="assign-task-status-badge">Pendiente</span>
                                </div>
                                <div className="assign-task-actions">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateTask(project.id);
                                    }}
                                    disabled={creatingTask}
                                    className="assign-task-save"
                                  >
                                    <Save size={14} />
                                    {creatingTask ? 'Creando...' : 'Crear Tarea'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowTaskForm(null);
                                    }}
                                    className="assign-task-cancel"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}

                            {isLoadingTasks ? (
                              <div className="assign-loading-tasks">
                                <div className="loading-spinner-small"></div>
                              </div>
                            ) : tasks.length === 0 ? (
                              <div className="assign-no-tasks">No hay tareas en este proyecto</div>
                            ) : (
                              tasks.map((task) => (
                                <div key={task.id} className="assign-task-item">
                                  {getTaskStatusIcon(task.status)}
                                  <span className={`assign-task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                                    {task.title}
                                  </span>
                                  {task.due_date && (
                                    <span className="assign-task-date-badge">
                                      <Calendar size={10} />
                                      {formatDate(task.due_date)}
                                    </span>
                                  )}
                                  <span 
                                    className="assign-task-priority"
                                    style={{ color: getPriorityColor(task.priority) }}
                                  >
                                    {getPriorityLabel(task.priority)}
                                  </span>
                                  <span className={`assign-task-status ${task.status}`}>
                                    {getTaskStatusLabel(task.status)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id, project.id);
                                    }}
                                    className="assign-task-delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="assign-modal-footer">
          {activeTab === 'assign' && (
            <button
              onClick={handleSubmit}
              disabled={submitting || loading}
              className="assign-btn-primary"
            >
              {submitting ? 'Guardando...' : 'Guardar Asignaciones'}
            </button>
          )}
          {activeTab === 'tasks' && (
            <button onClick={onClose} className="assign-btn-primary">
              Cerrar
            </button>
          )}
          <button onClick={onClose} className="assign-btn-secondary">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}