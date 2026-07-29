import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { 
  Folder, 
  Plus, 
  Eye, 
  FileText, 
  Calendar, 
  Users, 
  Search, 
  X,
  DollarSign,
  User,
  Clock
} from 'lucide-react';
import './ReportesProyectos.css';

const ReportesProyectos = () => {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);

  useEffect(() => {
    const cargarProyectos = async () => {
      try {
        const response = await api.get('/projects');
        const proyectosData = response.data;
        
        // 🔥 Obtener el progreso del último reporte para cada proyecto
        const proyectosConProgreso = await Promise.all(
          proyectosData.map(async (proyecto) => {
            try {
              // Obtener los reportes del proyecto
              const reportesResponse = await api.get(`/proyectos/${proyecto.id}/reportes`);
              const reportes = reportesResponse.data;
              
              // Si hay reportes, obtener el último (el más reciente)
              let ultimoProgreso = proyecto.progress || 0;
              
              if (reportes && reportes.length > 0) {
                // Ordenar por fecha de creación (el más reciente primero)
                const reportesOrdenados = reportes.sort((a, b) => 
                  new Date(b.created_at) - new Date(a.created_at)
                );
                const ultimoReporte = reportesOrdenados[0];
                
                // Usar el progreso del último reporte si existe
                if (ultimoReporte.progreso !== undefined && ultimoReporte.progreso !== null) {
                  ultimoProgreso = ultimoReporte.progreso;
                }
                
                // También guardar el último reporte para mostrarlo
                proyecto.ultimo_reporte = ultimoReporte;
              }
              
              return {
                ...proyecto,
                progress: ultimoProgreso,  // 🔥 Sobrescribir con el progreso del último reporte
                ultimo_reporte_progreso: ultimoProgreso
              };
            } catch (error) {
              console.error(`Error al obtener reportes del proyecto ${proyecto.id}:`, error);
              return {
                ...proyecto,
                progress: proyecto.progress || 0,
                ultimo_reporte_progreso: proyecto.progress || 0
              };
            }
          })
        );
        
        setProyectos(proyectosConProgreso);
      } catch (error) {
        console.error('Error al cargar proyectos:', error);
        setError('Error al cargar los proyectos');
      } finally {
        setLoading(false);
      }
    };

    cargarProyectos();
  }, []);

  const getStatusText = (status) => {
    const texts = {
      'pending': 'Pendiente',
      'in_progress': 'En Progreso',
      'completed': 'Completado',
      'cancelled': 'Cancelado'
    };
    return texts[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      'pending': 'status-pending',
      'in_progress': 'status-progress',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  };

  const getProgressColor = (progreso) => {
    if (progreso < 30) return '#ef4444';
    if (progreso < 60) return '#f59e0b';
    if (progreso < 85) return '#3b82f6';
    return '#10b981';
  };

  const filteredProyectos = proyectos.filter(proyecto => {
    const matchSearch = proyecto.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (proyecto.description && proyecto.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || proyecto.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  const handleVerProyecto = async (projectId) => {
    setProjectLoading(true);
    try {
      const response = await api.get(`/projects/${projectId}`);
      setSelectedProject(response.data);
      setShowProjectModal(true);
    } catch (error) {
      console.error('Error al cargar proyecto:', error);
      alert('Error al cargar los detalles del proyecto');
    } finally {
      setProjectLoading(false);
    }
  };

  const closeModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="reportes-container">
          <div className="reportes-loading">
            <div className="loading-spinner"></div>
            <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Cargando proyectos...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="reportes-container">
          <div className="reportes-main">
            <div className="error-message">{error}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="reportes-container">
        {/* HEADER */}
        <header className="reportes-header">
          <div className="reportes-header-content">
            <div className="reportes-title">
              <h1>Reportes de Proyectos</h1>
              <p>Selecciona un proyecto para ver sus reportes o crear uno nuevo</p>
            </div>
            <div className="reportes-actions">
              <Link to="/reportes/crear" className="btn-primary">
                <Plus size={18} />
                Nuevo Reporte
              </Link>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="reportes-main">
          {/* FILTROS */}
          <div className="reportes-filtros">
            <div className="filtro-search">
              <Search size={16} className="filtro-icon" />
              <input
                type="text"
                placeholder="Buscar proyecto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filtro-input"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="filtro-select"
            >
              <option value="todos">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* GRID */}
          {filteredProyectos.length === 0 ? (
            <div className="reportes-empty">
              <div className="empty-icon">📂</div>
              <h3>No hay proyectos disponibles</h3>
              <p>Crea un nuevo proyecto para comenzar a generar reportes.</p>
              <Link to="/projects/new" className="btn-primary" style={{ display: 'inline-flex' }}>
                <Plus size={18} />
                Crear Proyecto
              </Link>
            </div>
          ) : (
            <div className="reportes-grid">
              {filteredProyectos.map((proyecto) => (
                <div key={proyecto.id} className="reporte-card">
                  {/* CARD HEADER */}
                  <div className="reporte-card-header">
                    <div className="reporte-card-left">
                      <div className="reporte-icon">
                        <Folder size={20} />
                      </div>
                      <div>
                        <h3 className="reporte-card-title">{proyecto.name}</h3>
                        <p className="reporte-card-desc">
                          {proyecto.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                    <span className={`reporte-status ${getStatusClass(proyecto.status)}`}>
                      {getStatusText(proyecto.status)}
                    </span>
                  </div>

                  {/* CARD BODY */}
                  <div className="reporte-card-body">
                    <div className="reporte-metrics">
                      <div className="metric">
                        <Users size={14} />
                        <span>{proyecto.members_count || 0}</span>
                        <small>Empleados</small>
                      </div>
                      <div className="metric">
                        <FileText size={14} />
                        <span>{proyecto.reports_count || 0}</span>
                        <small>Reportes</small>
                      </div>
                      <div className="metric">
                        <Calendar size={14} />
                        <span>{proyecto.ultimo_reporte_progreso || 0}%</span>
                        <small>Progreso</small>
                      </div>
                    </div>

                    {/* 🔥 Barra de progreso - usa el progreso del último reporte */}
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ 
                          width: `${Math.min(proyecto.ultimo_reporte_progreso || 0, 100)}%`,
                          background: `linear-gradient(90deg, ${getProgressColor(proyecto.ultimo_reporte_progreso || 0)}, ${getProgressColor(proyecto.ultimo_reporte_progreso || 0)}dd)`
                        }}
                      />
                    </div>
                    
                    {/* 🔥 Mostrar información del último reporte */}
                    {proyecto.ultimo_reporte && (
                      <div className="ultimo-reporte-info">
                        <span className="ultimo-reporte-label">
                          Último reporte: {proyecto.ultimo_reporte.titulo}
                        </span>
                        <span className="ultimo-reporte-fecha">
                          {new Date(proyecto.ultimo_reporte.created_at).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CARD FOOTER */}
                  <div className="reporte-card-footer">
                    <button
                      onClick={() => handleVerProyecto(proyecto.id)}
                      className="btn-ver"
                    >
                      <Eye size={14} />
                      Ver Proyecto
                    </button>
                    <Link
                      to={`/reportes/crear/${proyecto.id}`}
                      className="btn-crear-reporte"
                    >
                      <Plus size={14} />
                      Crear Reporte
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ========================================== */}
      {/* MODAL DE VER PROYECTO */}
      {/* ========================================== */}
      {showProjectModal && selectedProject && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="modal-header">
              <h2>{selectedProject.name}</h2>
              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            {/* BODY */}
            <div className="modal-body">
              {/* Badge de estado */}
              <div className={`modal-status-badge ${getStatusClass(selectedProject.status)}`}>
                {getStatusText(selectedProject.status)}
              </div>

              {/* Grid de información */}
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <DollarSign size={16} />
                  <div>
                    <label>Presupuesto</label>
                    <span>${selectedProject.budget?.toLocaleString('es-MX') || 0} MXN</span>
                  </div>
                </div>

                <div className="modal-info-item">
                  <User size={16} />
                  <div>
                    <label>Cliente</label>
                    <span>{selectedProject.client_name || 'ID: ' + selectedProject.client_id}</span>
                  </div>
                </div>

                <div className="modal-info-item">
                  <Calendar size={16} />
                  <div>
                    <label>Fecha creación</label>
                    <span>{new Date(selectedProject.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>

                <div className="modal-info-item">
                  <Clock size={16} />
                  <div>
                    <label>Progreso</label>
                    <div className="modal-progress-container">
                      <div className="modal-progress-bar">
                        <div
                          className="modal-progress-fill"
                          style={{ 
                            width: `${selectedProject.progress || 0}%`,
                            background: `linear-gradient(90deg, ${getProgressColor(selectedProject.progress || 0)}, ${getProgressColor(selectedProject.progress || 0)}dd)`
                          }}
                        />
                      </div>
                      <span>{selectedProject.progress || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="modal-info-item">
                  <FileText size={16} />
                  <div>
                    <label>Estado</label>
                    <span>{getStatusText(selectedProject.status)}</span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              {selectedProject.description && (
                <div className="modal-description">
                  <h4>Descripción del proyecto</h4>
                  <p>{selectedProject.description}</p>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button onClick={closeModal} className="modal-btn-close">
                Cerrar
              </button>
              <Link
                to={`/reportes/crear/${selectedProject.id}`}
                className="modal-btn-primary"
              >
                <Plus size={16} />
                Crear Reporte
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportesProyectos;