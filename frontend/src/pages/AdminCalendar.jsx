import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { STATIC_URL } from '../services/api';
import Navbar from '../components/Navbar';
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, 
  AlertCircle, XCircle, FolderOpen, FileText, User, Users, 
  Filter, ChevronDown, Eye
} from 'lucide-react';
import './AdminCalendar.css';

export default function AdminCalendar() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [tasksByDate, setTasksByDate] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchProjects(),
        fetchEmployees()
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: 'Error al cargar datos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0]);
        await fetchTasks(response.data[0].id);
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/');
      const employeesList = response.data.filter(emp => emp.role === 'employee');
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  const fetchTasks = async (projectId, employeeId = null) => {
    setLoading(true);
    try {
      const response = await api.get(`/tasks/projects/${projectId}/tasks`);
      let tasksData = response.data;
      
      // Si hay un empleado seleccionado, filtrar por él
      if (employeeId) {
        tasksData = tasksData.filter(task => task.assigned_to === employeeId);
      }
      
      setTasks(tasksData);
      organizeTasksByDate(tasksData);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      setMessage({ text: 'Error al cargar tareas', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const organizeTasksByDate = (tasksList) => {
    const organized = {};
    tasksList.forEach(task => {
      if (task.due_date) {
        const dateKey = new Date(task.due_date).toDateString();
        if (!organized[dateKey]) {
          organized[dateKey] = [];
        }
        organized[dateKey].push(task);
      }
    });
    setTasksByDate(organized);
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
    setSelectedDate(null);
    // Si el empleado seleccionado no existe en el nuevo proyecto, resetear a "Todos"
    if (selectedEmployee) {
      fetchTasks(projectId, selectedEmployee.id);
    } else {
      fetchTasks(projectId);
    }
  };

  const handleEmployeeChange = (employeeId) => {
    const employee = employeeId ? employees.find(e => e.id === employeeId) : null;
    setSelectedEmployee(employee);
    setSelectedDate(null);
    if (selectedProject) {
      fetchTasks(selectedProject.id, employeeId || null);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const changeMonth = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const getPriorityColor = (priority) => {
    const map = {
      low: 'rgba(16, 185, 129, 0.25)',
      medium: 'rgba(245, 158, 11, 0.25)',
      high: 'rgba(249, 115, 22, 0.25)',
      urgent: 'rgba(239, 68, 68, 0.25)'
    };
    return map[priority] || 'rgba(107, 114, 128, 0.15)';
  };

  const getPrioritySolidColor = (priority) => {
    const map = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      urgent: '#ef4444'
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

  const getDayPriorityColors = (dateKey) => {
    if (!tasksByDate[dateKey] || tasksByDate[dateKey].length === 0) return null;
    
    const tasks = tasksByDate[dateKey];
    const colorCount = {};
    const total = tasks.length;
    
    tasks.forEach(task => {
      const color = getPrioritySolidColor(task.priority);
      if (!colorCount[color]) {
        colorCount[color] = 0;
      }
      colorCount[color]++;
    });
    
    const colorOrder = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];
    const segments = [];
    
    colorOrder.forEach(color => {
      if (colorCount[color]) {
        const percentage = (colorCount[color] / total) * 100;
        segments.push({
          color,
          percentage,
          count: colorCount[color]
        });
      }
    });
    
    if (segments.length === 1) {
      return {
        type: 'single',
        color: segments[0].color,
        total,
        segments
      };
    }
    
    return {
      type: 'multi',
      total,
      segments
    };
  };

  const getStatusIcon = (status) => {
    const map = {
      pending: <Clock size={14} style={{ color: '#f59e0b' }} />,
      in_progress: <AlertCircle size={14} style={{ color: '#3b82f6' }} />,
      completed: <CheckCircle size={14} style={{ color: '#10b981' }} />
    };
    return map[status] || <Clock size={14} />;
  };

  const getStatusLabel = (status) => {
    const map = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Finalizado'
    };
    return map[status] || status;
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.name : 'Sin asignar';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const days = getDaysInMonth(currentDate);
  const tasksOnSelectedDate = selectedDate ? tasksByDate[selectedDate.toDateString()] || [] : [];

  return (
    <>
      <Navbar />
      <div className="admin-calendar-container">
        <div className="calendar-header">
          <div className="calendar-header-content">
            <div className="calendar-title">
              <h1>Calendario de Tareas</h1>
              <p>Visualiza las tareas por proyecto y empleado</p>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`message-floating ${message.type}`}>
            {message.text}
          </div>
        )}

        <main className="calendar-main">
          {/* Filtros */}
          <div className="controls-bar">
            <div className="filter-group">
              <label className="filter-label">
                <FolderOpen size={16} />
                Proyecto
              </label>
              <select
                value={selectedProject?.id || ''}
                onChange={(e) => handleProjectChange(Number(e.target.value))}
                className="filter-select"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <User size={16} />
                Empleado
              </label>
              <select
                value={selectedEmployee?.id || ''}
                onChange={(e) => handleEmployeeChange(e.target.value ? Number(e.target.value) : null)}
                className="filter-select"
              >
                <option value="">Todos los empleados</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-info">
              <span className="task-counter">
                {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando tareas...</p>
            </div>
          ) : (
            <div className="calendar-wrapper">
              <div className="calendar-nav">
                <button onClick={() => changeMonth(-1)} className="nav-btn">
                  <ChevronLeft size={20} />
                </button>
                <span className="month-title">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <button onClick={() => changeMonth(1)} className="nav-btn">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="calendar-grid">
                {dayNames.map((day, index) => (
                  <div key={index} className="calendar-day-header">
                    {day}
                  </div>
                ))}

                {days.map((day, index) => {
                  const dateKey = day.date.toDateString();
                  const hasTasks = tasksByDate[dateKey] && tasksByDate[dateKey].length > 0;
                  const isSelected = selectedDate && dateKey === selectedDate.toDateString();
                  const isToday = new Date().toDateString() === dateKey;
                  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                  const priorityInfo = hasTasks ? getDayPriorityColors(dateKey) : null;

                  let dayStyle = {};
                  let borderColor = 'rgba(255,255,255,0.06)';
                  
                  if (priorityInfo) {
                    if (priorityInfo.type === 'single') {
                      const color = priorityInfo.color;
                      dayStyle = {
                        background: color + '30'
                      };
                      borderColor = color + '50';
                    } else {
                      const gradientStops = priorityInfo.segments.map((seg, idx) => {
                        const start = idx === 0 ? 0 : priorityInfo.segments.slice(0, idx).reduce((sum, s) => sum + s.percentage, 0);
                        return `${seg.color}30 ${start}% ${start + seg.percentage}%`;
                      }).join(', ');
                      dayStyle = {
                        background: `linear-gradient(to right, ${gradientStops})`
                      };
                      borderColor = 'rgba(255,255,255,0.15)';
                    }
                  }

                  return (
                    <div
                      key={index}
                      className={`calendar-day 
                        ${!day.isCurrentMonth ? 'other-month' : ''} 
                        ${isWeekend ? 'weekend' : ''} 
                        ${isToday ? 'today' : ''}
                        ${isSelected ? 'selected' : ''}
                        ${hasTasks ? 'has-tasks' : ''}`}
                      style={{
                        ...dayStyle,
                        borderColor: hasTasks ? borderColor : 'transparent'
                      }}
                      onClick={() => {
                        if (day.isCurrentMonth) {
                          setSelectedDate(day.date);
                        }
                      }}
                    >
                      <span className="day-number">{day.day}</span>
                      
                      {hasTasks && priorityInfo && (
                        <div className="priority-dots">
                          {priorityInfo.segments.map((seg, idx) => (
                            <span 
                              key={idx}
                              className="priority-dot"
                              style={{ backgroundColor: seg.color }}
                              title={`${getPriorityLabel(
                                ['urgent', 'high', 'medium', 'low'][idx] || 'tarea'
                              )}: ${seg.count} tarea${seg.count > 1 ? 's' : ''}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tareas del día seleccionado */}
              {selectedDate && (
                <div className="selected-date-tasks">
                  <div className="selected-date-header">
                    <h3>
                      <Calendar size={18} />
                      Tareas para {formatDate(selectedDate)}
                    </h3>
                    <span className="task-count-badge">
                      {tasksOnSelectedDate.length} tareas
                    </span>
                  </div>

                  {tasksOnSelectedDate.length === 0 ? (
                    <div className="empty-tasks">
                      <FileText size={32} />
                      <p>No hay tareas para esta fecha</p>
                    </div>
                  ) : (
                    <div className="tasks-list">
                      {tasksOnSelectedDate.map((task) => (
                        <div key={task.id} className="task-item">
                          <div className="task-item-header">
                            <span className="task-title">{task.title}</span>
                            <span 
                              className="task-priority"
                              style={{ backgroundColor: getPrioritySolidColor(task.priority) }}
                            >
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                          {task.description && (
                            <div className="task-description">{task.description}</div>
                          )}
                          <div className="task-meta">
                            <span className="task-status">
                              {getStatusIcon(task.status)}
                              {getStatusLabel(task.status)}
                            </span>
                            <span className="task-employee">
                              <User size={14} />
                              {getEmployeeName(task.assigned_to)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedDate && tasks.length > 0 && (
                <div className="select-date-hint">
                  <Calendar size={32} />
                  <p>Selecciona un día en el calendario para ver las tareas</p>
                </div>
              )}

              {tasks.length === 0 && (
                <div className="empty-state">
                  <Calendar size={48} />
                  <p className="empty-title">No hay tareas</p>
                  <p className="empty-subtitle">
                    {selectedEmployee 
                      ? `No hay tareas asignadas a ${selectedEmployee.name} en ${selectedProject?.name}`
                      : `No hay tareas en ${selectedProject?.name}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}