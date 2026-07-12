import { useState, useEffect } from 'react';
import { X, Check, FolderOpen, Plus, Clock, CheckCircle, AlertCircle, Trash2, Save, Users, FileText, Calendar } from 'lucide-react';
import api from '../services/api';

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
  
  // Estado para tareas en proyectos asignados
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
  
  // Pestaña activa: 'assign' o 'tasks'
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

  // ✅ CORREGIDO: Muestra TODAS las tareas del proyecto, no solo las del empleado
  const fetchProjectTasks = async (projectId) => {
    if (projectTasks[projectId]) return;
    
    setLoadingTasks(prev => ({ ...prev, [projectId]: true }));
    try {
      const response = await api.get(`/tasks/projects/${projectId}/tasks`);
      // ✅ Todas las tareas del proyecto (sin filtrar por empleado)
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

  if (!isOpen || !employee) return null;

  const getStatusText = (status) => {
    const map = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#10b981',
      cancelled: '#ef4444'
    };
    return map[status] || '#6b7280';
  };

  const getTaskStatusIcon = (status) => {
    if (status === 'completed') {
      return <CheckCircle size={14} style={{ color: '#10b981' }} />;
    } else if (status === 'in_progress') {
      return <Clock size={14} style={{ color: '#3b82f6' }} />;
    } else {
      return <AlertCircle size={14} style={{ color: '#f59e0b' }} />;
    }
  };

  const getTaskStatusLabel = (status) => {
    const map = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Finalizado'
    };
    return map[status] || status;
  };

  const getPriorityColor = (priority) => {
    const map = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };
    return map[priority] || '#6b7280';
  };

  const getPriorityLabel = (priority) => {
    const map = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return map[priority] || priority;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Gestionar Proyectos de {employee?.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Información del empleado */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59,130,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {employee.name?.charAt(0) || 'E'}
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 600 }}>{employee.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{employee.email}</div>
              <div style={{ color: '#60a5fa', fontSize: '0.7rem' }}>
                {employee.profession || 'Sin profesión'}
              </div>
            </div>
          </div>

          {/* Mensaje */}
          {message.text && (
            <div className={`message-floating ${message.type}`} style={{ 
              position: 'relative', 
              top: 0, 
              right: 0, 
              marginBottom: '12px',
              width: '100%'
            }}>
              {message.text}
            </div>
          )}

          {/* Pestañas */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '16px',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <button
              onClick={() => setActiveTab('assign')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'assign' ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: activeTab === 'assign' ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              <Users size={16} />
              Asignar Proyectos
              <span style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '1px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem'
              }}>
                {projects.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('tasks');
                assignedProjects.forEach(p => fetchProjectTasks(p.id));
              }}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'tasks' ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: activeTab === 'tasks' ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              <FileText size={16} />
              Gestionar Tareas
              <span style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '1px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem'
              }}>
                {assignedProjects.length}
              </span>
            </button>
          </div>

          {/* Contenido de la pestaña "Asignar Proyectos" */}
          {activeTab === 'assign' && (
            <>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px',
                padding: '0 4px'
              }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Proyectos disponibles
                </span>
                <span style={{ color: '#60a5fa', fontSize: '0.8rem' }}>
                  Seleccionados: {selectedProjects.length}
                </span>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                </div>
              ) : projects.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 0',
                  color: '#94a3b8'
                }}>
                  <FolderOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p>No hay proyectos disponibles</p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                  {projects.map((project) => {
                    const isSelected = selectedProjects.includes(project.id);
                    
                    return (
                      <div
                        key={project.id}
                        onClick={() => handleToggleProject(project.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          marginBottom: '6px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: isSelected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'rgba(59,130,246,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#3b82f6',
                          flexShrink: 0
                        }}>
                          <FolderOpen size={16} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            color: 'white', 
                            fontSize: '0.9rem', 
                            fontWeight: 500
                          }}>
                            {project.name}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontSize: '0.7rem',
                            color: '#94a3b8',
                            flexWrap: 'wrap'
                          }}>
                            <span>Cliente: {project.client_name || 'Sin cliente'}</span>
                            <span>•</span>
                            <span style={{ color: getStatusColor(project.status) }}>
                              {getStatusText(project.status)}
                            </span>
                          </div>
                        </div>

                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#94a3b8'}`,
                          background: isSelected ? '#3b82f6' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}>
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Contenido de la pestaña "Gestionar Tareas" */}
          {activeTab === 'tasks' && (
            <>
              {assignedProjects.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 0',
                  color: '#94a3b8'
                }}>
                  <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p>No hay proyectos asignados</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    Asigna proyectos primero en la pestaña "Asignar Proyectos"
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                  {assignedProjects.map((project) => {
                    const isExpanded = expandedProject === project.id;
                    const tasks = projectTasks[project.id] || [];
                    const loadingTasksForProject = loadingTasks[project.id];
                    const isTaskFormVisible = showTaskForm === project.id;
                    
                    return (
                      <div key={project.id} style={{ marginBottom: '12px' }}>
                        {/* Proyecto asignado */}
                        <div
                          onClick={() => handleExpandProject(project.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: isExpanded ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isExpanded ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(59,130,246,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3b82f6',
                            flexShrink: 0
                          }}>
                            <FolderOpen size={16} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>
                              {project.name}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              fontSize: '0.7rem',
                              color: '#94a3b8'
                            }}>
                              <span>Cliente: {project.client_name || 'Sin cliente'}</span>
                              <span>•</span>
                              <span>Tareas: {tasks.length}</span>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {isExpanded ? '▲' : '▼'}
                          </div>
                        </div>

                        {/* Tareas del proyecto */}
                        {isExpanded && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px 12px',
                            marginLeft: '48px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            {/* Botón para crear tarea */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTaskForm(isTaskFormVisible ? null : project.id);
                                setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 12px',
                                marginBottom: '8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(59,130,246,0.3)',
                                background: 'rgba(59,130,246,0.15)',
                                color: '#60a5fa',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59,130,246,0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(59,130,246,0.15)';
                              }}
                            >
                              <Plus size={14} />
                              Nueva Tarea
                            </button>

                            {/* Formulario crear tarea */}
                            {isTaskFormVisible && (
                              <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '12px',
                                borderRadius: '6px',
                                marginBottom: '12px',
                                border: '1px solid rgba(59,130,246,0.2)'
                              }}>
                                <input
                                  type="text"
                                  placeholder="Título de la tarea *"
                                  value={newTask.title}
                                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    marginBottom: '6px',
                                    borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: '0.85rem'
                                  }}
                                />
                                <textarea
                                  placeholder="Descripción (opcional)"
                                  value={newTask.description}
                                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    marginBottom: '6px',
                                    borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    resize: 'vertical',
                                    minHeight: '40px'
                                  }}
                                  rows="2"
                                />
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <select
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '4px',
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      color: 'white',
                                      fontSize: '0.8rem',
                                      flex: 1,
                                      minWidth: '100px'
                                    }}
                                  >
                                    <option value="low">🟢 Baja</option>
                                    <option value="medium">🟡 Media</option>
                                    <option value="high">🟠 Alta</option>
                                    <option value="urgent">🔴 Urgente</option>
                                  </select>

                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flex: 1,
                                    minWidth: '150px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '4px',
                                    padding: '0 8px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                  }}>
                                    <Calendar size={16} style={{ color: '#94a3b8' }} />
                                    <input
                                      type="date"
                                      value={newTask.due_date}
                                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                      style={{
                                        width: '100%',
                                        padding: '6px 0',
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'white',
                                        fontSize: '0.85rem'
                                      }}
                                    />
                                  </div>

                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#94a3b8',
                                    padding: '4px 8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    Estado: Pendiente
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateTask(project.id);
                                    }}
                                    disabled={creatingTask}
                                    style={{
                                      padding: '6px 16px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: '#3b82f6',
                                      color: 'white',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Save size={14} />
                                    {creatingTask ? 'Creando...' : 'Crear Tarea'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowTaskForm(null);
                                    }}
                                    style={{
                                      padding: '6px 16px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      background: 'transparent',
                                      color: '#94a3b8',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Lista de tareas */}
                            {loadingTasksForProject ? (
                              <div style={{ textAlign: 'center', padding: '8px', color: '#94a3b8' }}>
                                <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
                              </div>
                            ) : tasks.length === 0 ? (
                              <div style={{ 
                                textAlign: 'center', 
                                padding: '12px', 
                                color: '#64748b',
                                fontSize: '0.8rem'
                              }}>
                                No hay tareas en este proyecto
                              </div>
                            ) : (
                              tasks.map((task) => (
                                <div
                                  key={task.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    marginBottom: '4px',
                                    borderRadius: '4px',
                                    background: task.status === 'completed' ? 'rgba(16,185,129,0.05)' : 'transparent',
                                    border: '1px solid rgba(255,255,255,0.04)'
                                  }}
                                >
                                  {getTaskStatusIcon(task.status)}
                                  <span style={{
                                    color: task.status === 'completed' ? '#94a3b8' : 'white',
                                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                    fontSize: '0.85rem',
                                    flex: 1
                                  }}>
                                    {task.title}
                                  </span>
                                  {task.due_date && (
                                    <span style={{
                                      fontSize: '0.6rem',
                                      color: '#94a3b8',
                                      padding: '1px 6px',
                                      background: 'rgba(255,255,255,0.05)',
                                      borderRadius: '3px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      <Calendar size={10} />
                                      {formatDate(task.due_date)}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: '0.6rem',
                                    color: getPriorityColor(task.priority),
                                    background: `${getPriorityColor(task.priority)}22`,
                                    padding: '1px 6px',
                                    borderRadius: '3px'
                                  }}>
                                    {getPriorityLabel(task.priority)}
                                  </span>
                                  <span style={{
                                    fontSize: '0.55rem',
                                    color: task.status === 'completed' ? '#10b981' : 
                                           task.status === 'in_progress' ? '#3b82f6' : '#f59e0b',
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    background: task.status === 'completed' ? 'rgba(16,185,129,0.1)' : 
                                              task.status === 'in_progress' ? 'rgba(59,130,246,0.1)' : 
                                              'rgba(245,158,11,0.1)'
                                  }}>
                                    {getTaskStatusLabel(task.status)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id, project.id);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#94a3b8',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
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

        <div className="modal-footer">
          {activeTab === 'assign' && (
            <button
              onClick={handleSubmit}
              disabled={submitting || loading}
              className="btn-modal-primary"
              style={{ flex: 1 }}
            >
              {submitting ? 'Guardando...' : 'Guardar Asignaciones'}
            </button>
          )}
          {activeTab === 'tasks' && (
            <button
              onClick={onClose}
              className="btn-modal-primary"
              style={{ flex: 1 }}
            >
              Cerrar
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-modal-secondary"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}