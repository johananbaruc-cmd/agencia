import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import ReporteExpirado from '../../components/reportes/ReporteExpirado';
import { 
  Info, 
  FileText, 
  Clock, 
  User, 
  Building2, 
  DollarSign,
  Calendar,
  CheckCircle,
  FolderOpen,
  Download,
  Users,
  Mail,
  Briefcase,
  Sliders,
  CheckSquare,
  MessageSquare,
  Folder,
  Edit,
  X,
  Check,
  Upload
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
  
  const [respuestaCliente, setRespuestaCliente] = useState('');
  const [respuestaEnviada, setRespuestaEnviada] = useState(false);
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [mostrarModalExpiracion, setMostrarModalExpiracion] = useState(false);
  const [sesionId, setSesionId] = useState('');

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
        
        const progresoDelReporte = reporteBase.progreso || 0;
        
        if (progresoDelReporte > 0) {
          localStorage.setItem(`progreso_visual_${token}`, String(progresoDelReporte));
        }
        
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
      <div className="ver-reporte-wrapper">
        <div className="ver-loading">
          <div className="loading-spinner"></div>
          <p>Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ver-reporte-wrapper">
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
      <div className="ver-reporte-wrapper">
        <div className="ver-notfound">
          <div className="notfound-icon">📄</div>
          <h2>Reporte no encontrado</h2>
          <p>El reporte que buscas no existe o ha sido eliminado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ver-reporte-wrapper">
      <div className="ver-reporte-scroll">
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
      let fechaExpiracionStr = localStorage.getItem(`fecha_expiracion_${token}`);
      
      if (!fechaExpiracionStr) {
        fechaExpiracionStr = sessionStorage.getItem('fecha_expiracion');
        if (fechaExpiracionStr) {
          localStorage.setItem(`fecha_expiracion_${token}`, fechaExpiracionStr);
        }
      }
      
      if (!fechaExpiracionStr) {
        setTiempoRestante('--:--');
        return;
      }

      const expiracion = new Date(fechaExpiracionStr);
      const ahora = new Date();
      const diffMs = expiracion - ahora;
      
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

      const diffSegundos = Math.floor(diffMs / 1000);
      const horas = Math.floor(diffSegundos / 3600);
      const minutos = Math.floor((diffSegundos % 3600) / 60);
      const segundos = diffSegundos % 60;
      
      if (horas > 0) {
        setTiempoRestante(`${horas}h ${minutos.toString().padStart(2, '0')}m ${segundos.toString().padStart(2, '0')}s`);
      } else {
        setTiempoRestante(`${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`);
      }
    };

    calcularTiempo();
    const interval = setInterval(calcularTiempo, 1000);

    return () => clearInterval(interval);
  }, [token, onExpirado, expirado]);

  return <span className="temporizador-texto">{tiempoRestante}</span>;
};

export default VerReporte;