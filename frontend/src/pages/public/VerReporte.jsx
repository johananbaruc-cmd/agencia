import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import ReporteExpirado from '../../components/reportes/ReporteExpirado';
import VistaGraficas from '../../components/reportes/VistaGraficas';
import { 
  Info, 
  BarChart3, 
  FileText, 
  Clock, 
  User, 
  Building2, 
  DollarSign,
  Calendar,
  CheckCircle,
  TrendingUp,
  PieChart,
  Database,
  FolderOpen,
  Download,
  Users,
  Mail,
  Briefcase,
  Sliders,
  CheckSquare,
  MessageSquare,
  Eye,
  File,
  Image,
  FileArchive,
  Upload,
  Folder,
  Edit,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Activity,
  Target,
  GitBranch,
  LineChart,
  Calendar as CalendarIcon
} from 'lucide-react';
import './VerReporte.css';

const VerReporte = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expirado, setExpirado] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Estado para análisis
  const [analisis, setAnalisis] = useState([]);
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);
  const [ejecutandoAnalisis, setEjecutandoAnalisis] = useState(false);
  const [resultadoEjecucion, setResultadoEjecucion] = useState(null);
  const [analisisEjecutados, setAnalisisEjecutados] = useState(false); // 🔥 Control de ejecución
  
  // Progreso
  const [progresoVisual, setProgresoVisual] = useState(0);
  
  const [respuestaCliente, setRespuestaCliente] = useState('');
  const [respuestaEnviada, setRespuestaEnviada] = useState(false);
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [mostrarModalExpiracion, setMostrarModalExpiracion] = useState(false);
  const [sesionId, setSesionId] = useState('');
  
  // 🔥 Ref para controlar ejecución única
  const ejecucionRealizada = useRef(false);

  const getFechaExpiracion = () => {
    let fecha = localStorage.getItem(`fecha_expiracion_${token}`);
    if (!fecha) {
      fecha = sessionStorage.getItem('fecha_expiracion');
    }
    return fecha;
  };

  const verificarExpiracionSesion = () => {
    const fechaExpiracionStr = getFechaExpiracion();
    if (!fechaExpiracionStr) {
      navigate(`/acceso/reporte/${token}`);
      return true;
    }
    const expiracion = new Date(fechaExpiracionStr);
    const ahora = new Date();
    if (ahora > expiracion) {
      setExpirado(true);
      return true;
    }
    return false;
  };

  // ==========================================
  // Cargar análisis del reporte
  // ==========================================
  const cargarAnalisis = async (reporteId) => {
    setCargandoAnalisis(true);
    try {
      const response = await api.get(`/reportes/${reporteId}/analisis`);
      setAnalisis(response.data);
      console.log('📊 Análisis cargados:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('Error al cargar análisis:', error);
      setAnalisis([]);
      return [];
    } finally {
      setCargandoAnalisis(false);
    }
  };

  // ==========================================
  // Ejecutar todos los análisis seleccionados
  // ==========================================
  const ejecutarAnalisisSeleccionados = async () => {
    if (!reporte) return;
    if (ejecucionRealizada.current) return; // ✅ Solo ejecutar una vez
    
    setEjecutandoAnalisis(true);
    setResultadoEjecucion(null);
    
    try {
      console.log('📊 Ejecutando análisis para reporte:', reporte.id);
      
      const response = await api.post(`/reportes/${reporte.id}/analisis/ejecutar-todos`);
      setResultadoEjecucion(response.data);
      ejecucionRealizada.current = true; // ✅ Marcar como ejecutado
      setAnalisisEjecutados(true);
      
      // Recargar análisis después de ejecutar
      await cargarAnalisis(reporte.id);
      
      console.log('✅ Análisis ejecutados:', response.data);
      
      if (response.data.errores && response.data.errores.length > 0) {
        console.warn('⚠️ Algunos análisis fallaron:', response.data.errores);
      }
    } catch (error) {
      console.error('Error al ejecutar análisis:', error);
      // Si el error es porque no hay análisis seleccionados, no mostrar alerta
      if (error.response?.status !== 400) {
        console.error('Error detallado:', error.response?.data);
      }
    } finally {
      setEjecutandoAnalisis(false);
    }
  };

  // ==========================================
  // Cargar reporte principal
  // ==========================================
  useEffect(() => {
    const cargarReporte = async () => {
      if (verificarExpiracionSesion()) {
        setLoading(false);
        return;
      }

      try {
        const codigo = localStorage.getItem(`codigo_acceso_${token}`) || sessionStorage.getItem('codigo_acceso');
        if (!codigo) {
          navigate(`/acceso/reporte/${token}`);
          return;
        }

        const sesion = localStorage.getItem(`sesion_${token}`) || crypto.randomUUID();
        localStorage.setItem(`sesion_${token}`, sesion);
        setSesionId(sesion);
        console.log('📝 Sesión ID:', sesion);

        const response = await api.get(`/public/reportes/${token}`, {
          headers: {
            'X-Codigo-Acceso': codigo,
            'X-Session-Id': sesion
          }
        });

        const reporteBase = response.data;
        setReporte(reporteBase);
        
        // Progreso
        const progresoDelReporte = reporteBase.progreso || 0;
        setProgresoVisual(progresoDelReporte);
        
        if (progresoDelReporte > 0) {
          localStorage.setItem(`progreso_visual_${token}`, String(progresoDelReporte));
        }
        
        // 🔥 Cargar y ejecutar análisis automáticamente
        if (reporteBase.id) {
          // 1. Cargar análisis existentes
          const analisisExistentes = await cargarAnalisis(reporteBase.id);
          
          // 2. Verificar si hay configuración de análisis
          const configAnalisis = reporteBase.configuracion_analisis || {};
          const hayAnalisisSeleccionados = Object.values(configAnalisis).some(v => v === true);
          
          // 3. Si hay análisis seleccionados y no se han ejecutado aún
          if (hayAnalisisSeleccionados && !ejecucionRealizada.current) {
            console.log('📊 Ejecutando análisis automáticos...');
            // Pequeño delay para asegurar que el reporte está cargado
            setTimeout(async () => {
              await ejecutarAnalisisSeleccionados();
            }, 1000);
          } else if (analisisExistentes.length > 0) {
            console.log(`📊 ${analisisExistentes.length} análisis ya existentes`);
            ejecucionRealizada.current = true;
          } else {
            console.log('ℹ️ No hay análisis seleccionados en la configuración');
          }
        }
        
        // Respuesta del cliente
        const respuestaGuardada = sessionStorage.getItem(`respuesta_${token}`);
        if (respuestaGuardada) {
          setRespuestaEnviada(true);
          setRespuestaCliente(respuestaGuardada);
        }
        
      } catch (error) {
        console.error('Error al cargar reporte:', error);
        if (error.response?.status === 410) {
          setExpirado(true);
        } else if (error.response?.status === 401) {
          navigate(`/acceso/reporte/${token}`);
        } else {
          setError('Error al cargar el reporte. Intenta nuevamente.');
        }
      } finally {
        setLoading(false);
      }
    };

    cargarReporte();
  }, [token, navigate]);

  const handleEnviarRespuesta = async () => {
    if (!respuestaCliente.trim()) {
      console.log('⚠️ Respuesta vacía, no se envía');
      return;
    }
    
    setEnviandoRespuesta(true);
    try {
      const codigo = localStorage.getItem(`codigo_acceso_${token}`) || sessionStorage.getItem('codigo_acceso');
     
      const payload = {
        respuesta_pregunta: respuestaCliente,
        comentarios: respuestaCliente
      };
    
      await api.post(`/public/reportes/${token}/interactuar`, payload, {
        headers: {
          'X-Codigo-Acceso': codigo,
          'X-Session-Id': sesionId
        }
      });
      
      sessionStorage.setItem(`respuesta_${token}`, respuestaCliente);
      setRespuestaEnviada(true);
      setModoEdicion(false);
      
      setMostrarNotificacion(true);
      setTimeout(() => {
        setMostrarNotificacion(false);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error al enviar respuesta:', error);
      alert('Error al enviar tu respuesta. Intenta nuevamente.');
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  const cancelarEdicion = () => {
    const respuestaGuardada = sessionStorage.getItem(`respuesta_${token}`);
    if (respuestaGuardada) {
      setRespuestaCliente(respuestaGuardada);
    } else {
      setRespuestaCliente('');
    }
    setModoEdicion(false);
  };

  const iniciarEdicion = () => {
    const respuestaGuardada = sessionStorage.getItem(`respuesta_${token}`);
    if (respuestaGuardada) {
      setRespuestaCliente(respuestaGuardada);
    }
    setModoEdicion(true);
  };

  const descargarArchivo = async (itemId, nombre) => {
    try {
      const codigo = localStorage.getItem(`codigo_acceso_${token}`) || sessionStorage.getItem('codigo_acceso');
      if (!codigo) {
        alert('No se encontró el código de acceso');
        return;
      }

      const url = `${import.meta.env.VITE_API_URL}/public/reportes/${token}/archivos/${itemId}`;
      const response = await fetch(url, {
        headers: {
          'X-Codigo-Acceso': codigo
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          alert('El archivo no se encontró en el servidor');
        } else {
          throw new Error('Error al descargar el archivo');
        }
        return;
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = nombre || 'archivo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar el archivo');
    }
  };

  const handleTemporizadorExpirado = () => {
    setMostrarModalExpiracion(true);
  };

  const progresoTotal = reporte?.progreso || reporte?.proyecto_progress || 0;
  
  const todosLosArchivos = reporte?.archivos || [];
  const evidenciasTareas = reporte?.evidencias_tareas || [];
  const archivosExistentes = reporte?.archivos_existentes || [];

  const elementosUnificados = [...evidenciasTareas, ...archivosExistentes].reduce((acc, item) => {
    const exists = acc.some(el => el.id === item.id);
    if (!exists) {
      acc.push(item);
    }
    return acc;
  }, []);

  const getProgressColor = (progreso) => {
    if (progreso < 30) return '#ef4444';
    if (progreso < 60) return '#f59e0b';
    if (progreso < 85) return '#3b82f6';
    return '#10b981';
  };

  // ==========================================
  // ✅ FUNCIONES DE ANÁLISIS (10 TIPOS)
  // ==========================================
  const getAnalisisIcon = (tipo) => {
    const iconos = {
      'pca': <TrendingUp size={16} />,
      'regresion': <BarChart3 size={16} />,
      'clustering': <PieChart size={16} />,
      'estadisticas': <Database size={16} />,
      'regresion_gasto_tiempo': <Activity size={16} />,
      'regresion_rendimiento_empleado': <Users size={16} />,
      'regresion_presupuesto_plazo': <Target size={16} />,
      'curva_s': <LineChart size={16} />,
      'desviacion_plazos': <Calendar size={16} />,
      'prediccion_fin': <CalendarIcon size={16} />
    };
    return iconos[tipo] || <Activity size={16} />;
  };

  const getAnalisisNombre = (tipo) => {
    const nombres = {
      'pca': 'PCA - Análisis de Componentes Principales',
      'regresion': 'Regresión Lineal',
      'clustering': 'Clustering K-Means',
      'estadisticas': 'Estadísticas Descriptivas',
      'regresion_gasto_tiempo': 'Gasto vs Tiempo - Desviación presupuestaria',
      'regresion_rendimiento_empleado': 'Rendimiento del Empleado - Productividad',
      'regresion_presupuesto_plazo': 'Presupuesto vs Plazo - Eficiencia CPI/SPI',
      'curva_s': 'Curva S - Avance físico vs financiero',
      'desviacion_plazos': 'Desviación de Plazos - Tareas críticas',
      'prediccion_fin': 'Predicción de Fin - Fecha estimada'
    };
    return nombres[tipo] || tipo;
  };

  const getAnalisisColor = (tipo) => {
    const colores = {
      'pca': '#3b82f6',
      'regresion': '#8b5cf6',
      'clustering': '#f59e0b',
      'estadisticas': '#10b981',
      'regresion_gasto_tiempo': '#ef4444',
      'regresion_rendimiento_empleado': '#8b5cf6',
      'regresion_presupuesto_plazo': '#f59e0b',
      'curva_s': '#3b82f6',
      'desviacion_plazos': '#ef4444',
      'prediccion_fin': '#10b981'
    };
    return colores[tipo] || '#6b7280';
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return '📎';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📑';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (expirado) {
    return <ReporteExpirado token={token} />;
  }

  if (loading) {
    return (
      <div className="ver-reporte-container">
        <div className="ver-loading">
          <div className="loading-spinner"></div>
          <p>Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ver-reporte-container">
        <div className="ver-error">
          <div className="error-icon">⚠️</div>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="ver-reporte-container">
        <div className="ver-notfound">
          <div className="notfound-icon">📄</div>
          <h2>Reporte no encontrado</h2>
          <p>El reporte que buscas no existe o ha sido eliminado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ver-reporte-container">
      <div className="ver-reporte-inner">
        {/* Header del Reporte */}
        <div className="reporte-publico-header">
          <div className="header-publico-top">
            <div className="header-left">
              <h1>{reporte.titulo}</h1>
              <p className="header-desc">{reporte.descripcion || 'Sin descripción'}</p>
              <div className="header-meta">
                <span>
                  <Calendar size={14} />
                  {new Date(reporte.fecha_generacion).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className="badge-activo">
                  <CheckCircle size={14} />
                  Activo
                </span>
                <span>
                  <Clock size={14} />
                  <Temporizador 
                    token={token} 
                    onExpirado={handleTemporizadorExpirado}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progreso Visual */}
        <div className="detalle-section progreso-visual-section">
          <h3 className="section-title">
            <Sliders size={18} />
            Progreso del Proyecto
          </h3>
          <div className="progreso-visual-detalle">
            <div className="progreso-barra-detalle">
              <div className="progreso-barra-container-detalle">
                <div 
                  className="progreso-barra-fill-detalle" 
                  style={{ 
                    width: `${progresoTotal}%`,
                    background: `linear-gradient(90deg, ${getProgressColor(progresoTotal)}, ${getProgressColor(progresoTotal)}dd)`
                  }}
                />
              </div>
              <span className="progreso-porcentaje-detalle" style={{ color: getProgressColor(progresoTotal) }}>
                {progresoTotal}%
              </span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <Info size={16} />
              Información General
            </button>
            <button
              className={`tab-btn ${activeTab === 'analisis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analisis')}
            >
              <BarChart3 size={16} />
              Análisis de Datos
              {analisis.length > 0 && (
                <span className="tab-badge">{analisis.length}</span>
              )}
            </button>
            <button
              className={`tab-btn ${activeTab === 'archivos' ? 'active' : ''}`}
              onClick={() => setActiveTab('archivos')}
            >
              <FolderOpen size={16} />
              Evidencias y Archivos
              {elementosUnificados.length > 0 && (
                <span className="tab-badge">{elementosUnificados.length}</span>
              )}
            </button>
          </div>

          {/* TAB 1: INFORMACIÓN GENERAL */}
          {activeTab === 'info' && (
            <div className="tab-content">
              <div className="seccion-reporte info-proyecto-section">
                <h2 className="seccion-titulo">
                  <Folder size={18} />
                  Información del Proyecto
                </h2>
                <div className="info-proyecto-grid">
                  <div className="info-card">
                    <div className="info-card-icon"><Building2 size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Proyecto</span>
                      <span className="info-card-value">{reporte.proyecto_nombre || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon"><DollarSign size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Presupuesto</span>
                      <span className="info-card-value">${reporte.proyecto_budget?.toLocaleString('es-MX') || 0} MXN</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon"><Users size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Empleados</span>
                      <span className="info-card-value">{reporte.total_empleados || 0}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon"><User size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Administrador</span>
                      <span className="info-card-value">{reporte.admin_name || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon"><Briefcase size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Agencia</span>
                      <span className="info-card-value">{reporte.agency_name || 'No especificada'}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon"><Mail size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Correo</span>
                      <span className="info-card-value">{reporte.agency_email || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon"><FileText size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Estado</span>
                      <span className="info-card-value status-text">{reporte.proyecto_status || 'No especificado'}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-icon"><Calendar size={18} /></div>
                    <div className="info-card-content">
                      <span className="info-card-label">Fechas</span>
                      <span className="info-card-value">
                        {reporte.proyecto_start_date ? new Date(reporte.proyecto_start_date).toLocaleDateString('es-MX') : 'N/A'} - {reporte.proyecto_end_date ? new Date(reporte.proyecto_end_date).toLocaleDateString('es-MX') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {reporte.texto_avance && (
                <div className="seccion-reporte">
                  <h2 className="seccion-titulo">
                    <FileText size={18} />
                    Avance del Proyecto
                  </h2>
                  <p className="texto-avance">{reporte.texto_avance}</p>
                </div>
              )}

              {reporte.pregunta_cliente && (
                <div className="seccion-reporte pregunta-cliente-section">
                  <h2 className="seccion-titulo">
                    <MessageSquare size={18} />
                    Pregunta para el Cliente
                  </h2>
                  <div className="pregunta-container">
                    <p className="pregunta-texto">{reporte.pregunta_cliente}</p>
                    
                    {respuestaEnviada ? (
                      <div className="respuesta-enviada">
                        <div className="respuesta-header-actions">
                          <div className="respuesta-header-info">
                            <CheckCircle size={20} className="respuesta-icon" />
                            <span>Tu respuesta ha sido enviada</span>
                          </div>
                          {!modoEdicion && (
                            <button onClick={iniciarEdicion} className="btn-editar-respuesta">
                              <Edit size={14} />
                              Editar
                            </button>
                          )}
                        </div>
                        
                        {modoEdicion ? (
                          <div className="respuesta-form editar">
                            <textarea
                              value={respuestaCliente}
                              onChange={(e) => setRespuestaCliente(e.target.value)}
                              className="respuesta-textarea"
                              rows={4}
                              autoFocus
                            />
                            <div className="respuesta-actions-editar">
                              <button 
                                onClick={handleEnviarRespuesta}
                                disabled={enviandoRespuesta || !respuestaCliente.trim()}
                                className="btn-guardar-edicion"
                              >
                                <Check size={16} />
                                {enviandoRespuesta ? 'Guardando...' : 'Guardar cambios'}
                              </button>
                              <button onClick={cancelarEdicion} className="btn-cancelar-edicion">
                                <X size={16} />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="respuesta-texto">{respuestaCliente}</p>
                        )}
                      </div>
                    ) : (
                      <div className="respuesta-form">
                        <textarea
                          value={respuestaCliente}
                          onChange={(e) => setRespuestaCliente(e.target.value)}
                          placeholder="Escribe tu respuesta aquí..."
                          className="respuesta-textarea"
                          rows={4}
                        />
                        <button
                          onClick={handleEnviarRespuesta}
                          disabled={enviandoRespuesta || !respuestaCliente.trim()}
                          className="btn-enviar-respuesta"
                        >
                          {enviandoRespuesta ? 'Enviando...' : 'Enviar Respuesta'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANÁLISIS DE DATOS */}
          {activeTab === 'analisis' && (
            <div className="tab-content">
              <div className="analisis-header-actions">
                <h3 className="analisis-tab-title">
                  <BarChart3 size={18} />
                  Análisis de Datos
                </h3>
                {reporte && (
                  <button
                    onClick={ejecutarAnalisisSeleccionados}
                    disabled={ejecutandoAnalisis || analisisEjecutados}
                    className="btn-ejecutar-analisis"
                  >
                    <RefreshCw size={16} className={ejecutandoAnalisis ? 'spin' : ''} />
                    {ejecutandoAnalisis ? 'Ejecutando...' : analisisEjecutados ? 'Análisis ejecutados' : 'Ejecutar Análisis'}
                  </button>
                )}
              </div>

              {cargandoAnalisis ? (
                <div className="analisis-loading">
                  <div className="loading-spinner-small"></div>
                  <p>Cargando análisis...</p>
                </div>
              ) : analisis.length > 0 ? (
                <div className="analisis-list">
                  {analisis.map((item) => (
                    <div key={item.id} className="analisis-item">
                      <div className="analisis-item-header">
                        <div className="analisis-item-icon" style={{ backgroundColor: getAnalisisColor(item.tipo_analisis) + '20', color: getAnalisisColor(item.tipo_analisis) }}>
                          {getAnalisisIcon(item.tipo_analisis)}
                        </div>
                        <div className="analisis-item-info">
                          <h4>{item.nombre || getAnalisisNombre(item.tipo_analisis)}</h4>
                          <p className="analisis-item-desc">{item.descripcion || 'Análisis de datos del proyecto'}</p>
                        </div>
                        <div className="analisis-item-meta">
                          <span className="analisis-item-tipo" style={{ backgroundColor: getAnalisisColor(item.tipo_analisis) + '20', color: getAnalisisColor(item.tipo_analisis) }}>
                            {item.tipo_analisis}
                          </span>
                          {item.nivel_riesgo && (
                            <span className={`analisis-riesgo-badge riesgo-${item.nivel_riesgo}`}>
                              {item.nivel_riesgo.toUpperCase()}
                            </span>
                          )}
                          <span className="analisis-item-tiempo">
                            <Clock size={12} />
                            {item.tiempo_ejecucion_ms}ms
                          </span>
                        </div>
                      </div>

                      {item.recomendaciones && item.recomendaciones.length > 0 && (
                        <div className="analisis-recomendaciones">
                          <strong>📋 Recomendaciones:</strong>
                          <ul>
                            {item.recomendaciones.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.alertas && item.alertas.length > 0 && (
                        <div className="analisis-alertas">
                          {item.alertas.map((alerta, idx) => (
                            <div key={idx} className={`alerta-item alerta-${alerta.tipo}`}>
                              <AlertCircle size={14} />
                              <span>{alerta.mensaje}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.resultados && (
                        <div className="analisis-item-resultados">
                          {/* Resultados por tipo - Todos los tipos están incluidos */}
                          {item.tipo_analisis === 'regresion_gasto_tiempo' && (
                            <div className="resultados-gasto-tiempo">
                              <div className="resultado-item">
                                <span className="resultado-label">Ecuación:</span>
                                <span className="resultado-value">{item.resultados.ecuacion}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">R² Score:</span>
                                <span className="resultado-value" style={{ color: item.resultados.r2_score > 0.7 ? '#10b981' : '#f59e0b' }}>
                                  {(item.resultados.r2_score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Desviación:</span>
                                <span className="resultado-value" style={{ color: Math.abs(item.resultados.desviacion_porcentaje) > 20 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.desviacion_porcentaje?.toFixed(1)}%
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Gasto estimado final:</span>
                                <span className="resultado-value">${item.resultados.gasto_estimado_final?.toFixed(2)}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Muestras:</span>
                                <span className="resultado-value">{item.resultados.n_muestras}</span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'regresion_rendimiento_empleado' && (
                            <div className="resultados-rendimiento">
                              <div className="resultado-item">
                                <span className="resultado-label">Empleado:</span>
                                <span className="resultado-value">{item.resultados.empleado || 'No especificado'}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Tendencia:</span>
                                <span className={`resultado-value tendencia-${item.resultados.tendencia}`}>
                                  {item.resultados.tendencia?.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Riesgo de sobrecarga:</span>
                                <span className="resultado-value" style={{ color: item.resultados.riesgo_sobrecarga > 70 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.riesgo_sobrecarga?.toFixed(1)}%
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Retraso promedio:</span>
                                <span className="resultado-value">{item.resultados.promedio_retraso?.toFixed(1)} días</span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'regresion_presupuesto_plazo' && (
                            <div className="resultados-presupuesto-plazo">
                              <div className="resultado-item">
                                <span className="resultado-label">CPI:</span>
                                <span className="resultado-value" style={{ color: item.resultados.cpi_promedio < 0.9 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.cpi_promedio?.toFixed(2)}
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">SPI:</span>
                                <span className="resultado-value" style={{ color: item.resultados.spi_promedio < 0.9 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.spi_promedio?.toFixed(2)}
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">R² Score:</span>
                                <span className="resultado-value">{(item.resultados.r2_score * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'curva_s' && (
                            <div className="resultados-curva-s">
                              <div className="resultado-item">
                                <span className="resultado-label">Desviación promedio:</span>
                                <span className="resultado-value" style={{ color: Math.abs(item.resultados.desviacion_promedio) > 10 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.desviacion_promedio?.toFixed(1)}%
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Avance físico:</span>
                                <span className="resultado-value">{item.resultados.avance_fisico?.[item.resultados.avance_fisico.length - 1]?.toFixed(1)}%</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Avance financiero:</span>
                                <span className="resultado-value">{item.resultados.avance_financiero?.[item.resultados.avance_financiero.length - 1]?.toFixed(1)}%</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Muestras:</span>
                                <span className="resultado-value">{item.resultados.n_muestras}</span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'desviacion_plazos' && (
                            <div className="resultados-desviacion">
                              <div className="resultado-item">
                                <span className="resultado-label">Retraso promedio:</span>
                                <span className="resultado-value">{item.resultados.desviacion_promedio?.toFixed(1)} días</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Retraso máximo:</span>
                                <span className="resultado-value">{item.resultados.desviacion_maxima?.toFixed(1)} días</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Tareas retrasadas:</span>
                                <span className="resultado-value">{item.resultados.total_tareas_retrasadas} de {item.resultados.total_tareas}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Probabilidad de cumplir plazo:</span>
                                <span className="resultado-value" style={{ color: item.resultados.probabilidad_cumplir_plazo < 50 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.probabilidad_cumplir_plazo?.toFixed(1)}%
                                </span>
                              </div>
                              {item.resultados.tareas_criticas?.length > 0 && (
                                <div className="resultado-item">
                                  <span className="resultado-label">Tareas críticas:</span>
                                  <span className="resultado-value">
                                    {item.resultados.tareas_criticas.map(t => t.nombre).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {item.tipo_analisis === 'prediccion_fin' && (
                            <div className="resultados-prediccion">
                              <div className="resultado-item">
                                <span className="resultado-label">Fecha estimada de fin:</span>
                                <span className="resultado-value">
                                  {item.resultados.fecha_estimada_fin ? new Date(item.resultados.fecha_estimada_fin).toLocaleDateString('es-MX') : 'N/A'}
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Días estimados:</span>
                                <span className="resultado-value">{item.resultados.dias_totales_estimados?.toFixed(0)} días</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Días de diferencia:</span>
                                <span className="resultado-value" style={{ color: Math.abs(item.resultados.dias_diferencia) > 15 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.dias_diferencia > 0 ? '+' : ''}{item.resultados.dias_diferencia} días
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Probabilidad de cumplir:</span>
                                <span className="resultado-value" style={{ color: item.resultados.probabilidad_cumplir < 50 ? '#ef4444' : '#10b981' }}>
                                  {item.resultados.probabilidad_cumplir?.toFixed(1)}%
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">R² Score:</span>
                                <span className="resultado-value">{(item.resultados.r2_score * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'pca' && (
                            <div className="resultados-pca">
                              <div className="resultado-item">
                                <span className="resultado-label">Varianza explicada:</span>
                                <span className="resultado-value">
                                  {item.resultados.varianza_explicada?.map((v, i) => (
                                    <span key={i} className="varianza-item">
                                      PC{i+1}: {(v * 100).toFixed(1)}%
                                    </span>
                                  ))}
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Componentes:</span>
                                <span className="resultado-value">{item.resultados.n_componentes}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Variables:</span>
                                <span className="resultado-value">{item.resultados.n_variables}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Muestras:</span>
                                <span className="resultado-value">{item.resultados.n_muestras}</span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'regresion' && (
                            <div className="resultados-regresion">
                              <div className="resultado-item">
                                <span className="resultado-label">R² Score:</span>
                                <span className="resultado-value" style={{ color: item.resultados.r2_score > 0.7 ? '#10b981' : '#f59e0b' }}>
                                  {(item.resultados.r2_score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">MSE:</span>
                                <span className="resultado-value">{item.resultados.mse?.toFixed(2)}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Coeficientes:</span>
                                <span className="resultado-value">
                                  {Object.entries(item.resultados.coeficientes || {}).map(([key, val]) => (
                                    <span key={key} className="coeficiente-item">
                                      {key}: {typeof val === 'number' ? val.toFixed(2) : val}
                                    </span>
                                  ))}
                                </span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'clustering' && (
                            <div className="resultados-clustering">
                              <div className="resultado-item">
                                <span className="resultado-label">Clusters:</span>
                                <span className="resultado-value">{item.resultados.n_clusters}</span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Silhouette Score:</span>
                                <span className="resultado-value" style={{ color: item.resultados.silhouette_score > 0.5 ? '#10b981' : '#f59e0b' }}>
                                  {item.resultados.silhouette_score?.toFixed(3)}
                                </span>
                              </div>
                              <div className="resultado-item">
                                <span className="resultado-label">Muestras:</span>
                                <span className="resultado-value">{item.resultados.n_muestras}</span>
                              </div>
                            </div>
                          )}

                          {item.tipo_analisis === 'estadisticas' && (
                            <div className="resultados-estadisticas">
                              {Object.entries(item.resultados.estadisticas || {}).map(([variable, stats]) => (
                                <div key={variable} className="estadistica-item">
                                  <span className="estadistica-variable">{variable}</span>
                                  <div className="estadistica-valores">
                                    <span>Media: {stats.mean?.toFixed(2)}</span>
                                    <span>Mediana: {stats['50%']?.toFixed(2)}</span>
                                    <span>Min: {stats.min?.toFixed(2)}</span>
                                    <span>Max: {stats.max?.toFixed(2)}</span>
                                    <span>Std: {stats.std?.toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Gráficas */}
                      {item.datos_grafica && (
                        <div className="analisis-item-grafica">
                          <VistaGraficas analisis={[item]} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-tab">
                  <BarChart3 size={48} />
                  <h3>No hay análisis disponibles</h3>
                  <p>Este reporte no contiene análisis de datos.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVIDENCIAS Y ARCHIVOS */}
          {activeTab === 'archivos' && (
            <div className="tab-content">
              {elementosUnificados.length > 0 && (
                <div className="seccion-archivos">
                  <h3 className="seccion-titulo">
                    <CheckSquare size={18} />
                    Evidencias y Archivos de Tareas
                    <span className="badge-count">{elementosUnificados.length}</span>
                  </h3>
                  <div className="elementos-grid">
                    {elementosUnificados.map((item) => {
                      const esEvidencia = item.descripcion !== undefined || item.archivo_nombre !== undefined;
                      const nombre = item.archivo_nombre || item.nombre || 'Sin nombre';
                      const descripcion = item.descripcion || '';
                      const tarea = item.tarea_nombre || 'Sin tarea';
                      const fecha = item.fecha || '';
                      const tamaño = item.file_size || item.tamaño || 0;
                      
                      return (
                        <div key={item.id} className="elemento-card">
                          <div className="elemento-header">
                            <span className="elemento-icon">{getFileIcon(nombre)}</span>
                            <span className="elemento-nombre">{nombre}</span>
                            <span className="elemento-size">{formatFileSize(tamaño)}</span>
                            <span className="elemento-tarea">📁 {tarea}</span>
                            {esEvidencia && (
                              <span className="elemento-tipo badge-evidencia">Evidencia</span>
                            )}
                          </div>
                          <div className="elemento-detalles">
                            {descripcion && (
                              <p className="elemento-desc">
                                <strong>Descripción:</strong> {descripcion}
                              </p>
                            )}
                            {fecha && (
                              <span className="elemento-fecha">
                                <Calendar size={14} />
                                {new Date(fecha).toLocaleDateString('es-MX')}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => descargarArchivo(item.id, nombre)}
                            className="btn-descargar-evidencia"
                          >
                            <Download size={14} />
                            Descargar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {todosLosArchivos.length > 0 && (
                <div className="seccion-archivos">
                  <h3 className="seccion-titulo">
                    <Upload size={18} />
                    Archivos Subidos al Reporte
                    <span className="badge-count">{todosLosArchivos.length}</span>
                  </h3>
                  <div className="archivos-grid">
                    {todosLosArchivos.map((archivo) => (
                      <div key={archivo.id} className="archivo-card">
                        <div className="archivo-card-left">
                          <span className="archivo-icon">
                            {archivo.tipo_archivo === 'pdf' ? '📄' :
                             archivo.tipo_archivo === 'docx' || archivo.tipo_archivo === 'doc' ? '📝' :
                             archivo.tipo_archivo === 'xlsx' || archivo.tipo_archivo === 'xls' ? '📊' :
                             archivo.tipo_archivo === 'png' || archivo.tipo_archivo === 'jpg' || archivo.tipo_archivo === 'jpeg' ? '🖼️' :
                             '📎'}
                          </span>
                          <div>
                            <p className="archivo-nombre">{archivo.nombre_original}</p>
                            <p className="archivo-meta">
                              {archivo.tipo_archivo?.toUpperCase()} • {(archivo.tamaño_bytes / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => descargarArchivo(archivo.id, archivo.nombre_original)}
                          className="btn-descargar-archivo"
                        >
                          <Download size={14} />
                          Descargar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {elementosUnificados.length === 0 && todosLosArchivos.length === 0 && (
                <div className="empty-state-tab">
                  <FolderOpen size={48} />
                  <h3>No hay archivos disponibles</h3>
                  <p>Este reporte no contiene archivos adjuntos ni evidencias.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="reporte-footer">
          <p>Este reporte expirará en {reporte.horas_expiracion || 24} horas desde la primera vez que fue abierto.</p>
          <p>© {new Date().getFullYear()} - Todos los derechos reservados</p>
        </div>
      </div>

      {/* NOTIFICACIÓN */}
      {mostrarNotificacion && (
        <div className="notificacion-envio">
          <div className="notificacion-envio-content">
            <Check size={24} className="notificacion-icon" />
            <span>¡Respuesta enviada correctamente!</span>
          </div>
        </div>
      )}

      {/* MODAL DE EXPIRACIÓN */}
      {mostrarModalExpiracion && (
        <div className="modal-expiracion-overlay">
          <div className="modal-expiracion">
            <div className="modal-expiracion-icon">⏰</div>
            <h2>Reporte Expirado</h2>
            <p>El tiempo de acceso a este reporte ha expirado.</p>
            <p className="modal-expiracion-mensaje">
              Por favor, contacta al administrador para obtener un nuevo enlace de acceso.
            </p>
            <button 
              onClick={() => {
                setMostrarModalExpiracion(false);
                navigate(`/acceso/reporte/${token}`);
              }}
              className="btn-modal-expiracion"
            >
              Volver a inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🔥 TEMPORIZADOR CON TIEMPO REAL
// ==========================================
const Temporizador = ({ token, onExpirado }) => {
  const [tiempoRestante, setTiempoRestante] = useState('');
  const [expirado, setExpirado] = useState(false);

  useEffect(() => {
    const calcularTiempo = () => {
      // Buscar fecha de expiración en localStorage primero
      let fechaExpiracionStr = localStorage.getItem(`fecha_expiracion_${token}`);
      
      // Si no está en localStorage, buscar en sessionStorage
      if (!fechaExpiracionStr) {
        fechaExpiracionStr = sessionStorage.getItem('fecha_expiracion');
        if (fechaExpiracionStr) {
          localStorage.setItem(`fecha_expiracion_${token}`, fechaExpiracionStr);
        }
      }
      
      // Si no hay fecha, mostrar "--:--"
      if (!fechaExpiracionStr) {
        setTiempoRestante('--:--');
        return;
      }

      const expiracion = new Date(fechaExpiracionStr);
      const ahora = new Date();
      const diffMs = expiracion - ahora;
      
      // Si ya expiró
      if (diffMs <= 0) {
        setTiempoRestante('⏰ Expirado');
        if (!expirado) {
          setExpirado(true);
          if (onExpirado) {
            onExpirado();
          }
        }
        return;
      }

      // Calcular tiempo restante
      const diffSegundos = Math.floor(diffMs / 1000);
      const horas = Math.floor(diffSegundos / 3600);
      const minutos = Math.floor((diffSegundos % 3600) / 60);
      const segundos = diffSegundos % 60;
      
      // Formatear tiempo
      if (horas > 0) {
        setTiempoRestante(`${horas}h ${minutos.toString().padStart(2, '0')}m ${segundos.toString().padStart(2, '0')}s`);
      } else {
        setTiempoRestante(`${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`);
      }
    };

    // Calcular inmediatamente
    calcularTiempo();
    
    // Actualizar cada segundo
    const interval = setInterval(calcularTiempo, 1000);

    return () => clearInterval(interval);
  }, [token, onExpirado, expirado]);

  return <span className="temporizador-texto">{tiempoRestante}</span>;
};

export default VerReporte;