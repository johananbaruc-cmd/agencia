import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { 
  Eye, 
  Trash2, 
  Search, 
  Plus, 
  RefreshCw,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Folder,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Calendar,
  Download,
  Building2,
  AlertTriangle,
  X,
  Edit
} from 'lucide-react';
import './ReportesGestion.css';

const ReportesGestion = () => {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterProyecto, setFilterProyecto] = useState('todos');
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [mostrarRespuestas, setMostrarRespuestas] = useState(false);
  const [proyectoInfo, setProyectoInfo] = useState(null);
  
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [reporteAEliminar, setReporteAEliminar] = useState(null);
  const [eliminandoProgreso, setEliminandoProgreso] = useState(false);

  const [mostrarModalRespuestas, setMostrarModalRespuestas] = useState(false);
  const [respuestasCliente, setRespuestasCliente] = useState([]);
  const [reporteParaRespuestas, setReporteParaRespuestas] = useState(null);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      const proyectosRes = await api.get('/projects');
      setProyectos(proyectosRes.data);
      await cargarTodosLosReportes(proyectosRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarTodosLosReportes = async (proyectosList) => {
    setLoadingReportes(true);
    const proyectosData = proyectosList || proyectos;
    let todosLosReportes = [];
    
    try {
      for (const proyecto of proyectosData) {
        try {
          const reportesRes = await api.get(`/proyectos/${proyecto.id}/reportes`);
          const reportesConProyecto = reportesRes.data.map(r => ({
            ...r,
            proyecto_nombre: proyecto.name
          }));
          todosLosReportes = [...todosLosReportes, ...reportesConProyecto];
        } catch (error) {
          console.error(`Error al cargar reportes del proyecto ${proyecto.id}:`, error);
        }
      }
      
      todosLosReportes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReportes(todosLosReportes);
    } catch (error) {
      console.error('Error al cargar reportes:', error);
      setError('Error al cargar los reportes');
    } finally {
      setLoadingReportes(false);
    }
  };

  const cargarReportes = async () => {
    await cargarTodosLosReportes(proyectos);
  };

  const abrirModalEliminar = (reporte) => {
    setReporteAEliminar(reporte);
    setMostrarModalEliminar(true);
  };

  const cerrarModalEliminar = () => {
    setMostrarModalEliminar(false);
    setReporteAEliminar(null);
  };

  const confirmarEliminar = async () => {
    if (!reporteAEliminar) return;
    
    setEliminandoProgreso(true);
    try {
      await api.delete(`/reportes/${reporteAEliminar.id}`);
      setReportes(reportes.filter(r => r.id !== reporteAEliminar.id));
      if (reporteSeleccionado?.id === reporteAEliminar.id) {
        setReporteSeleccionado(null);
        setMostrarDetalles(false);
      }
      cerrarModalEliminar();
    } catch (error) {
      console.error('Error al eliminar reporte:', error);
      const mensaje = error.response?.data?.detail || 'Error al eliminar el reporte';
      alert(`❌ ${mensaje}`);
    } finally {
      setEliminandoProgreso(false);
    }
  };

  const verDetalles = async (reporteId) => {
    try {
      const response = await api.get(`/reportes/${reporteId}`, {
        params: { incluir_detalles: true }
      });
      setReporteSeleccionado(response.data);
      
      const proyectoRes = await api.get(`/projects/${response.data.project_id}`);
      setProyectoInfo(proyectoRes.data);
      
      setMostrarDetalles(true);
      setMostrarRespuestas(false);
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      alert('Error al cargar los detalles del reporte');
    }
  };

  const verRespuestas = async (reporte) => {
    try {
      setReporteParaRespuestas(reporte);
      const response = await api.get(`/reportes/${reporte.id}/interacciones`);
      setRespuestasCliente(response.data || []);
      setMostrarModalRespuestas(true);
    } catch (error) {
      console.error('Error al cargar respuestas:', error);
      if (error.response?.status === 404) {
        setRespuestasCliente([]);
        setMostrarModalRespuestas(true);
      } else {
        alert('Error al cargar las respuestas del cliente');
      }
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'publicado':
        return <span className="badge badge-publicado"><CheckCircle size={14} /> Publicado</span>;
      case 'borrador':
        return <span className="badge badge-borrador"><AlertCircle size={14} /> Borrador</span>;
      case 'expirado':
        return <span className="badge badge-expirado"><XCircle size={14} /> Expirado</span>;
      default:
        return <span className="badge badge-borrador">{estado}</span>;
    }
  };

  const getProjectName = (projectId) => {
    const proyecto = proyectos.find(p => p.id === projectId);
    return proyecto ? proyecto.name : 'Proyecto no encontrado';
  };

  const reportesFiltrados = reportes.filter(reporte => {
    const matchesSearch = reporte.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          reporte.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'todos' || reporte.estado === filterEstado;
    const matchesProyecto = filterProyecto === 'todos' || reporte.project_id === parseInt(filterProyecto);
    return matchesSearch && matchesEstado && matchesProyecto;
  });

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Mexico_City'
    });
  };

  const handleVerProyecto = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleVerReporteCompleto = (reporteId) => {
    navigate(`/reportes/detalle/${reporteId}`);
  };

  if (loading || loadingReportes) {
    return (
      <>
        <Navbar />
        <div className="gestion-container">
          <div className="gestion-loading">
            <div className="loading-spinner"></div>
            <p>Cargando reportes...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="gestion-container">
        <div className="gestion-main">
          <div className="gestion-header">
            <div>
              <h1>Gestión de Reportes</h1>
              <p>Administra todos los reportes generados y las respuestas de los clientes</p>
            </div>
            <div className="gestion-actions">
              <button onClick={cargarReportes} className="btn-refresh">
                <RefreshCw size={18} />
                Actualizar
              </button>
              <button onClick={() => navigate('/reportes/crear')} className="btn-crear">
                <Plus size={18} />
                Nuevo Reporte
              </button>
            </div>
          </div>

          <div className="gestion-filtros">
            <div className="filtro-busqueda">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar reportes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filtro-estado">
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                <option value="publicado">Publicados</option>
                <option value="borrador">Borradores</option>
                <option value="expirado">Expirados</option>
              </select>
            </div>
            <div className="filtro-proyecto">
              <select value={filterProyecto} onChange={(e) => setFilterProyecto(e.target.value)}>
                <option value="todos">Todos los proyectos</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="gestion-stats">
            <div className="stat-card">
              <div className="stat-number">{reportes.length}</div>
              <div className="stat-label">Total Reportes</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{reportes.filter(r => r.estado === 'publicado').length}</div>
              <div className="stat-label">Publicados</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{reportes.filter(r => r.estado === 'borrador').length}</div>
              <div className="stat-label">Borradores</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{reportes.filter(r => r.estado === 'expirado').length}</div>
              <div className="stat-label">Expirados</div>
            </div>
          </div>

          <div className="gestion-lista">
            {reportesFiltrados.length === 0 ? (
              <div className="empty-state">
                <Folder size={48} />
                <h3>No hay reportes</h3>
                <p>Comienza creando un nuevo reporte para tu proyecto.</p>
                <button onClick={() => navigate('/reportes/crear')} className="btn-crear-empty">
                  <Plus size={18} />
                  Crear Reporte
                </button>
              </div>
            ) : (
              <div className="reportes-grid">
                {reportesFiltrados.map((reporte) => (
                  <div key={reporte.id} className="reporte-card">
                    <div className="reporte-card-header">
                      <div className="reporte-titulo">
                        <h3>{reporte.titulo}</h3>
                        {getEstadoBadge(reporte.estado)}
                      </div>
                      <div className="reporte-acciones">
                        <button 
                          onClick={() => verDetalles(reporte.id)}
                          className="btn-ver"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => abrirModalEliminar(reporte)}
                          className="btn-eliminar"
                          title="Eliminar reporte"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="reporte-card-body">
                      <div className="reporte-proyecto">
                        <Building2 size={14} />
                        <span>{getProjectName(reporte.project_id)}</span>
                      </div>
                      {reporte.descripcion && (
                        <p className="reporte-descripcion">{reporte.descripcion}</p>
                      )}
                      <div className="reporte-metas">
                        <span>
                          <Calendar size={14} />
                          {formatearFecha(reporte.created_at)}
                        </span>
                        <span>
                          <Eye size={14} />
                          {reporte.veces_visto || 0} visitas
                        </span>
                        {reporte.codigo_acceso && (
                          <span className="reporte-codigo">
                            🔑 {reporte.codigo_acceso}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="reporte-card-footer">
                      <button 
                        onClick={() => handleVerProyecto(reporte.project_id)}
                        className="btn-proyecto"
                      >
                        <Building2 size={14} />
                        Ver proyecto
                      </button>
                      {reporte.estado === 'publicado' && (
                        <button 
                          onClick={() => verRespuestas(reporte)}
                          className="btn-respuestas"
                        >
                          <MessageSquare size={14} />
                          Ver respuestas
                        </button>
                      )}
                      <button 
                        onClick={() => handleVerReporteCompleto(reporte.id)}
                        className="btn-ir-detalle"
                      >
                        Ver completo →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mostrarDetalles && reporteSeleccionado && (
            <div className="modal-overlay" onClick={() => setMostrarDetalles(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{reporteSeleccionado.titulo}</h2>
                  <button onClick={() => setMostrarDetalles(false)} className="modal-close">
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  {proyectoInfo && (
                    <div className="modal-proyecto-info">
                      <h4>
                        <Building2 size={16} />
                        Proyecto: {proyectoInfo.name}
                      </h4>
                      <button 
                        onClick={() => handleVerProyecto(proyectoInfo.id)}
                        className="btn-ir-proyecto-modal"
                      >
                        Ver proyecto completo
                      </button>
                    </div>
                  )}

                  <div className="modal-info-grid">
                    <div className="modal-info-item">
                      <span className="modal-info-label">Estado</span>
                      {getEstadoBadge(reporteSeleccionado.estado)}
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Código de acceso</span>
                      <span className="modal-info-value">{reporteSeleccionado.codigo_acceso || 'N/A'}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Visitas</span>
                      <span className="modal-info-value">{reporteSeleccionado.veces_visto || 0}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Creado</span>
                      <span className="modal-info-value">{formatearFecha(reporteSeleccionado.created_at)}</span>
                    </div>
                  </div>
                  
                  {reporteSeleccionado.descripcion && (
                    <div className="modal-descripcion">
                      <h4>Descripción</h4>
                      <p>{reporteSeleccionado.descripcion}</p>
                    </div>
                  )}
                  
                  {reporteSeleccionado.texto_avance && (
                    <div className="modal-avance">
                      <h4>Avance del proyecto</h4>
                      <p>{reporteSeleccionado.texto_avance}</p>
                    </div>
                  )}

                  {reporteSeleccionado.pregunta_cliente && (
                    <div className="modal-pregunta">
                      <h4>Pregunta para el cliente</h4>
                      <p className="pregunta-texto-modal">{reporteSeleccionado.pregunta_cliente}</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  {reporteSeleccionado.estado === 'publicado' && (
                    <button 
                      onClick={() => verRespuestas(reporteSeleccionado)}
                      className="btn-toggle-respuestas"
                    >
                      <MessageSquare size={16} />
                      Ver respuestas
                    </button>
                  )}
                  <button 
                    onClick={() => handleVerReporteCompleto(reporteSeleccionado.id)}
                    className="btn-ir-detalle-modal"
                  >
                    Ver reporte completo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ MODAL DE RESPUESTAS - SOLO MUESTRA LA RESPUESTA */}
          {mostrarModalRespuestas && (
            <div className="modal-overlay" onClick={() => setMostrarModalRespuestas(false)}>
              <div className="modal-respuestas-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>
                    <MessageSquare size={18} />
                    Respuestas del Cliente
                    {reporteParaRespuestas && (
                      <span className="modal-subtitle"> - {reporteParaRespuestas.titulo}</span>
                    )}
                  </h2>
                  <button onClick={() => setMostrarModalRespuestas(false)} className="modal-close">
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  {respuestasCliente.length === 0 ? (
                    <div className="no-respuestas-container">
                      <MessageSquare size={48} className="no-respuestas-icon" />
                      <p className="no-respuestas-text">No hay respuestas del cliente</p>
                      <p className="no-respuestas-sub">El cliente aún no ha respondido a la pregunta</p>
                    </div>
                  ) : (
                    <div className="respuestas-list">
                      {respuestasCliente.map((interaccion) => (
                        <div key={interaccion.id} className="respuesta-card">
                          <div className="respuesta-card-header">
                            <div className="respuesta-card-info">
                              <span className="respuesta-fecha">
                                <Calendar size={14} />
                                {formatearFecha(interaccion.fecha_visto)}
                              </span>
                              <span className="respuesta-sesion">
                                Sesión: {interaccion.sesion_id?.slice(0, 8) || 'N/A'}
                              </span>
                            </div>
                            {interaccion.archivos_descargados && interaccion.archivos_descargados.length > 0 && (
                              <span className="respuesta-downloads">
                                <Download size={12} />
                                {interaccion.archivos_descargados.length} descargas
                              </span>
                            )}
                          </div>
                          <div className="respuesta-card-body">
                            {/* ✅ SOLO MOSTRAR LA RESPUESTA (no el comentario duplicado) */}
                            {interaccion.respuesta_pregunta && (
                              <div className="respuesta-texto">
                                <span className="respuesta-label">Respuesta:</span>
                                <p>{interaccion.respuesta_pregunta}</p>
                              </div>
                            )}
                            {/* ❌ ELIMINADO: Sección de comentarios duplicada */}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    onClick={() => setMostrarModalRespuestas(false)}
                    className="btn-cerrar-respuestas"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {mostrarModalEliminar && reporteAEliminar && (
            <div className="modal-eliminar-overlay" onClick={cerrarModalEliminar}>
              <div className="modal-eliminar-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-eliminar-close" onClick={cerrarModalEliminar}>
                  <X size={20} />
                </button>
                
                <div className="modal-eliminar-icon">
                  <AlertTriangle size={48} />
                </div>
                
                <h2>¿Eliminar reporte?</h2>
                
                <p className="modal-eliminar-mensaje">
                  Estás a punto de eliminar el reporte <strong>"{reporteAEliminar.titulo}"</strong>.
                  {reporteAEliminar.estado === 'publicado' && (
                    <span className="texto-advertencia"> ⚠️ Este reporte está <strong>PUBLICADO</strong> y los clientes ya tienen acceso a él.</span>
                  )}
                  {reporteAEliminar.estado === 'expirado' && (
                    <span className="texto-advertencia"> ⚠️ Este reporte está <strong>EXPIRADO</strong>.</span>
                  )}
                  {reporteAEliminar.estado === 'borrador' && (
                    <span className="texto-info"> 📝 Este reporte está en estado <strong>borrador</strong>.</span>
                  )}
                  <br />
                  <span className="texto-importante">Esta acción no se puede deshacer.</span>
                </p>
                
                <div className="modal-eliminar-info">
                  <div className="modal-eliminar-info-item">
                    <span className="modal-eliminar-info-label">Proyecto</span>
                    <span className="modal-eliminar-info-value">{getProjectName(reporteAEliminar.project_id)}</span>
                  </div>
                  <div className="modal-eliminar-info-item">
                    <span className="modal-eliminar-info-label">Estado</span>
                    <span className="modal-eliminar-info-value">{getEstadoBadge(reporteAEliminar.estado)}</span>
                  </div>
                  <div className="modal-eliminar-info-item">
                    <span className="modal-eliminar-info-label">Creado</span>
                    <span className="modal-eliminar-info-value">{formatearFecha(reporteAEliminar.created_at)}</span>
                  </div>
                </div>
                
                <div className="modal-eliminar-actions">
                  <button 
                    onClick={cerrarModalEliminar}
                    className="btn-eliminar-cancelar"
                    disabled={eliminandoProgreso}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmarEliminar}
                    className="btn-eliminar-confirmar"
                    disabled={eliminandoProgreso}
                  >
                    {eliminandoProgreso ? (
                      <>
                        <span className="spinner-small"></span>
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Sí, eliminar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReportesGestion;