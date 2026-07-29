import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Share2,
  Clock,
  Eye,
  Users,
  CheckSquare,
  Calendar,
  Printer,
  Edit,
  QrCode,
  Folder,
  BarChart3,
  TrendingUp,
  PieChart,
  Database,
  AlertCircle,
  Sliders,
  Upload,
  FolderOpen,
  Building2,
  User,
  Mail,
  Briefcase,
  DollarSign
} from 'lucide-react';
import './DetalleReporte.css';

const DetalleReporte = () => {
  const { reporteId } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [copiadoCodigo, setCopiadoCodigo] = useState(false);
  const [publicando, setPublicando] = useState(false);
  
  // 🔥 Progreso - ahora viene de la BD
  const [progresoVisual, setProgresoVisual] = useState(0);
  const [esReporteRecienCreado, setEsReporteRecienCreado] = useState(false);
  
  const [proyectoInfo, setProyectoInfo] = useState({
    nombre: '',
    descripcion: '',
    status: '',
    progress: 0,
    budget: 0,
    total_empleados: 0,
    admin_name: '',
    admin_email: '',
    agency_name: '',
    agency_email: '',
    agency_rfc: '',
    start_date: null,
    end_date: null
  });
  
  // ✅ Estados unificados
  const [archivosSubidos, setArchivosSubidos] = useState([]);
  const [elementosDeTareas, setElementosDeTareas] = useState([]);

  useEffect(() => {
    const cargarReporte = async () => {
      try {
        const response = await api.get(`/reportes/${reporteId}`, {
          params: { incluir_detalles: true }
        });
        
        const reporteBase = response.data;
        setReporte(reporteBase);
        
        // 🔥 OBTENER PROGRESO DEL REPORTE (de la BD)
        const progresoDelReporte = reporteBase.progreso || 0;
        
        const reporteCreadoId = sessionStorage.getItem('reporte_creado_id');
        const esRecienCreado = reporteCreadoId === String(reporteBase.id);
        setEsReporteRecienCreado(esRecienCreado);
        
        if (esRecienCreado) {
          // Si es recién creado, usar el progreso de sessionStorage
          const progreso = parseInt(sessionStorage.getItem('progreso_visual') || '0');
          setProgresoVisual(progreso);
          console.log('📊 Progreso de sessionStorage:', progreso);
        } else {
          // 🔥 USAR EL PROGRESO DEL REPORTE (guardado en BD)
          setProgresoVisual(progresoDelReporte);
          console.log('📊 Progreso del reporte (BD):', progresoDelReporte);
        }
        
        await cargarInfoProyecto(reporteBase);
        await cargarArchivosYEvidencias(reporteBase);
        
      } catch (error) {
        console.error('Error al cargar reporte:', error);
        setError('Error al cargar el reporte');
      } finally {
        setLoading(false);
      }
    };

    cargarReporte();
  }, [reporteId]);

  const cargarInfoProyecto = async (reporteBase) => {
    try {
      const projectResponse = await api.get(`/projects/${reporteBase.project_id}`);
      const project = projectResponse.data;
      
      let totalEmpleados = 0;
      try {
        const membersResponse = await api.get(`/projects/${reporteBase.project_id}/members`);
        totalEmpleados = membersResponse.data?.length || 0;
      } catch (error) {
        console.error('Error al cargar miembros:', error);
      }
      
      let adminName = '';
      let adminEmail = '';
      let agencyName = '';
      let agencyEmail = '';
      let agencyRfc = '';
      
      try {
        const adminResponse = await api.get(`/users/${reporteBase.admin_id}`);
        const admin = adminResponse.data;
        adminName = admin.name || '';
        adminEmail = admin.email || '';
        
        if (admin.agency_id) {
          try {
            const agencyResponse = await api.get(`/agencies/${admin.agency_id}`);
            const agency = agencyResponse.data;
            agencyName = agency.name || '';
            agencyEmail = agency.email || '';
            agencyRfc = agency.rfc || '';
          } catch (error) {
            console.error('Error al cargar agencia:', error);
          }
        }
      } catch (error) {
        console.error('Error al cargar admin:', error);
      }
      
      setProyectoInfo({
        nombre: project.name || '',
        descripcion: project.description || '',
        status: project.status || '',
        progress: project.progress || 0,
        budget: project.budget || 0,
        total_empleados: totalEmpleados,
        admin_name: adminName,
        admin_email: adminEmail,
        agency_name: agencyName,
        agency_email: agencyEmail,
        agency_rfc: agencyRfc,
        start_date: project.start_date || null,
        end_date: project.end_date || null
      });
      
    } catch (error) {
      console.error('Error al cargar información del proyecto:', error);
    }
  };

  // ✅ FUNCIÓN UNIFICADA: Cargar archivos y evidencias
  const cargarArchivosYEvidencias = async (reporteBase) => {
    try {
      const projectId = reporteBase.project_id;
      if (!projectId) {
        console.warn('No hay project_id en el reporte');
        return;
      }

      // 1. Obtener TODAS las tareas del proyecto
      const tasksResponse = await api.get(`/tasks/projects/${projectId}/tasks`);
      const tasks = tasksResponse.data;

      // 2. Obtener TODAS las evidencias de TODAS las tareas
      let todasLasEvidencias = [];
      for (const task of tasks) {
        try {
          const evidenceResponse = await api.get(`/tasks/${task.id}/evidence`);
          const evidenciasConTarea = evidenceResponse.data.map(ev => ({
            ...ev,
            tarea_id: task.id,
            tarea_nombre: task.title,
            tarea_descripcion: task.description || ''
          }));
          todasLasEvidencias = [...todasLasEvidencias, ...evidenciasConTarea];
        } catch (error) {
          console.error(`Error cargando evidencias de tarea ${task.id}:`, error);
        }
      }

      // 3. Obtener los IDs guardados en el reporte (UNIFICADOS)
      const evidenciasIds = reporteBase.evidencias_ids || [];
      const archivosIds = reporteBase.archivos_existentes_ids || [];
      
      // 4. UNIFICAR: Combinar evidencias_ids y archivos_existentes_ids (sin duplicados)
      const idsUnificados = [...new Set([...evidenciasIds, ...archivosIds])];
      
      console.log('📋 IDs unificados:', idsUnificados);

      // 5. Filtrar elementos de tareas (UNIFICADOS)
      const elementosFiltrados = todasLasEvidencias.filter(ev => 
        idsUnificados.includes(ev.id)
      );
      
      console.log('✅ Elementos de tareas unificados:', elementosFiltrados.length);
      setElementosDeTareas(elementosFiltrados);

      // 6. Archivos subidos directamente al reporte
      const archivosSubidosDirectamente = reporteBase.archivos || [];
      console.log('✅ Archivos subidos al reporte:', archivosSubidosDirectamente.length);
      setArchivosSubidos(archivosSubidosDirectamente);

    } catch (error) {
      console.error('Error al cargar archivos y evidencias:', error);
    }
  };

  const handlePublicar = async () => {
    setPublicando(true);
    try {
      const response = await api.post(`/reportes/${reporteId}/publicar`, {
        titulo: reporte.titulo,
        descripcion: reporte.descripcion,
        texto_avance: reporte.texto_avance,
        pregunta_cliente: reporte.pregunta_cliente
      });
      setReporte(response.data.reporte);
    } catch (error) {
      console.error('Error al publicar:', error);
      alert('Error al publicar el reporte');
    } finally {
      setPublicando(false);
    }
  };

  const copiarEnlace = () => {
    const url = `${window.location.origin}/acceso/reporte/${reporte.enlace_publico}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(reporte.codigo_acceso);
    setCopiadoCodigo(true);
    setTimeout(() => setCopiadoCodigo(false), 3000);
  };

  const getAnalisisNombre = (tipo) => {
    const nombres = {
      'pca': 'PCA - Reducción de dimensionalidad',
      'regresion': 'Regresión Lineal - Predicción de tendencias',
      'clustering': 'Clustering - Agrupación de datos',
      'estadisticas': 'Estadísticas - Análisis descriptivo'
    };
    return nombres[tipo] || tipo;
  };

  const getAnalisisIcon = (tipo) => {
    const iconos = {
      'pca': <TrendingUp size={16} />,
      'regresion': <BarChart3 size={16} />,
      'clustering': <PieChart size={16} />,
      'estadisticas': <Database size={16} />
    };
    return iconos[tipo] || <FileText size={16} />;
  };

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

  // 🔥 OBTENER EL PROGRESO CORRECTO
  const obtenerProgresoMostrar = () => {
    if (esReporteRecienCreado) {
      return progresoVisual;
    }
    // Si el reporte tiene progreso en la BD, usarlo
    if (reporte?.progreso !== undefined && reporte?.progreso !== null) {
      return reporte.progreso;
    }
    // Fallback: usar el progreso del proyecto
    return reporte?.proyecto_progress || 0;
  };

  const progresoTotal = obtenerProgresoMostrar();

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="detalle-container">
          <div className="detalle-loading">
            <div className="loading-spinner"></div>
            <p>Cargando reporte...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !reporte) {
    return (
      <>
        <Navbar />
        <div className="detalle-container">
          <div className="detalle-main">
            <div className="error-message">
              {error || 'Reporte no encontrado'}
            </div>
          </div>
        </div>
      </>
    );
  }

  const estaPublicado = reporte.estado === 'publicado';
  const noHayElementosTareas = elementosDeTareas.length === 0;

  return (
    <>
      <Navbar />
      <div className="detalle-container">
        <div className="detalle-main">
          {/* Botón Volver */}
          <button onClick={() => navigate('/reportes/proyectos')} className="btn-back">
            <ArrowLeft size={18} />
            Volver a proyectos
          </button>

          {/* HEADER */}
          <div className="detalle-header">
            <div className="header-top">
              <div>
                <h1>{reporte.titulo}</h1>
                <p className="header-desc">{reporte.descripcion || 'Sin descripción'}</p>
                <div className="header-meta">
                  <span className={`estado-badge ${reporte.estado === 'publicado' ? 'estado-publicado' : 'estado-borrador'}`}>
                    {reporte.estado === 'publicado' ? '✅ Publicado' : '📝 Borrador'}
                  </span>
                  <span>
                    <Clock size={14} />
                    {new Date(reporte.created_at).toLocaleString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span>
                    <Eye size={14} />
                    {reporte.veces_visto || 0} visitas
                  </span>
                </div>
              </div>
              {!estaPublicado && (
                <button
                  onClick={handlePublicar}
                  disabled={publicando}
                  className="btn-publicar"
                >
                  <Share2 size={16} />
                  {publicando ? 'Publicando...' : 'Publicar Reporte'}
                </button>
              )}
            </div>
          </div>

          {/* 🔥 PROGRESO VISUAL - AHORA MUESTRA EL PROGRESO DEL REPORTE */}
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
              {reporte.progreso !== undefined && reporte.progreso !== null && (
                <div className="progreso-origen">
                  <span className="progreso-origen-badge">
                    📊 Guardado en el reporte
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ INFORMACIÓN DEL PROYECTO - SOLO CAMPOS CON VALORES */}
          <div className="detalle-section info-proyecto-section">
            <h3 className="section-title">
              <Folder size={18} />
              Información del Proyecto
            </h3>
            <div className="info-proyecto-grid">
              {/* Proyecto */}
              <div className="info-card">
                <div className="info-card-icon"><Building2 size={18} /></div>
                <div className="info-card-content">
                  <span className="info-card-label">Proyecto</span>
                  <span className="info-card-value">{proyectoInfo.nombre || 'No especificado'}</span>
                </div>
              </div>

              {/* Presupuesto */}
              <div className="info-card">
                <div className="info-card-icon"><DollarSign size={18} /></div>
                <div className="info-card-content">
                  <span className="info-card-label">Presupuesto</span>
                  <span className="info-card-value">${proyectoInfo.budget?.toLocaleString('es-MX') || 0} MXN</span>
                </div>
              </div>

              {/* Empleados */}
              <div className="info-card">
                <div className="info-card-icon"><Users size={18} /></div>
                <div className="info-card-content">
                  <span className="info-card-label">Empleados</span>
                  <span className="info-card-value">{proyectoInfo.total_empleados || 0}</span>
                </div>
              </div>

              {/* Estado */}
              <div className="info-card">
                <div className="info-card-icon"><FileText size={18} /></div>
                <div className="info-card-content">
                  <span className="info-card-label">Estado</span>
                  <span className="info-card-value status-text">{proyectoInfo.status || 'No especificado'}</span>
                </div>
              </div>

              {/* ✅ Administrador - SOLO si tiene valor */}
              {proyectoInfo.admin_name && (
                <div className="info-card">
                  <div className="info-card-icon"><User size={18} /></div>
                  <div className="info-card-content">
                    <span className="info-card-label">Administrador</span>
                    <span className="info-card-value">{proyectoInfo.admin_name}</span>
                  </div>
                </div>
              )}

              {/* ✅ Agencia - SOLO si tiene valor */}
              {proyectoInfo.agency_name && (
                <div className="info-card">
                  <div className="info-card-icon"><Briefcase size={18} /></div>
                  <div className="info-card-content">
                    <span className="info-card-label">Agencia</span>
                    <span className="info-card-value">{proyectoInfo.agency_name}</span>
                  </div>
                </div>
              )}

              {/* ✅ Correo - SOLO si tiene valor */}
              {proyectoInfo.agency_email && (
                <div className="info-card">
                  <div className="info-card-icon"><Mail size={18} /></div>
                  <div className="info-card-content">
                    <span className="info-card-label">Correo</span>
                    <span className="info-card-value">{proyectoInfo.agency_email}</span>
                  </div>
                </div>
              )}

              {/* ✅ RFC - SOLO si tiene valor */}
              {proyectoInfo.agency_rfc && (
                <div className="info-card">
                  <div className="info-card-icon"><FileText size={18} /></div>
                  <div className="info-card-content">
                    <span className="info-card-label">RFC</span>
                    <span className="info-card-value">{proyectoInfo.agency_rfc}</span>
                  </div>
                </div>
              )}

              {/* ✅ Fechas - SOLO si tiene fechas válidas */}
              {proyectoInfo.start_date && proyectoInfo.end_date && (
                <div className="info-card">
                  <div className="info-card-icon"><Calendar size={18} /></div>
                  <div className="info-card-content">
                    <span className="info-card-label">Fechas</span>
                    <span className="info-card-value">
                      {new Date(proyectoInfo.start_date).toLocaleDateString('es-MX')} - {new Date(proyectoInfo.end_date).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN DE ACCESO */}
          {estaPublicado && (
            <div className="acceso-section">
              <h3 className="acceso-title">
                <Share2 size={18} />
                Compartir Reporte
              </h3>
              
              <div className="acceso-grid">
                <div className="acceso-item">
                  <p className="acceso-label">Código de Acceso</p>
                  <div className="acceso-value">
                    <code>{reporte.codigo_acceso}</code>
                    <button onClick={copiarCodigo} className={`btn-copy ${copiadoCodigo ? 'copied' : ''}`}>
                      {copiadoCodigo ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="acceso-item">
                  <p className="acceso-label">Enlace Público</p>
                  <div className="acceso-value">
                    <code className="enlace-code">
                      {`${window.location.origin}/acceso/reporte/${reporte.enlace_publico}`}
                    </code>
                    <button onClick={copiarEnlace} className={`btn-copy ${copiado ? 'copied' : ''}`}>
                      {copiado ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {reporte.codigo_qr && (
                <div className="qr-container">
                  <div className="qr-box">
                    <img src={reporte.codigo_qr} alt="Código QR" />
                    <p>📱 Escanea para acceder</p>
                  </div>
                </div>
              )}

              <div className="expira-notice">
                ⏰ El código expirará {reporte.horas_expiracion || 24} horas después de la primera apertura
              </div>
            </div>
          )}

          {/* ESTADÍSTICAS */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👁️</div>
              <div className="stat-number">{reporte.veces_visto || 0}</div>
              <div className="stat-label">Visitas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📄</div>
              <div className="stat-number">
                {archivosSubidos.length + elementosDeTareas.length || 0}
              </div>
              <div className="stat-label">Archivos</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-number">{proyectoInfo.total_empleados || 0}</div>
              <div className="stat-label">Empleados</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-number">{reporte.analisis?.length || 0}</div>
              <div className="stat-label">Análisis</div>
            </div>
          </div>

          {/* CONFIGURACIÓN DE ANÁLISIS */}
          {reporte.configuracion_analisis && (
            <div className="detalle-section">
              <h3 className="section-title">
                <BarChart3 size={18} />
                Configuración de Análisis
              </h3>
              <div className="analisis-config-grid">
                {Object.entries(reporte.configuracion_analisis).map(([key, value]) => {
                  if (value) {
                    return (
                      <div key={key} className="analisis-config-item">
                        {getAnalisisIcon(key)}
                        <span>{getAnalisisNombre(key)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
                {!Object.values(reporte.configuracion_analisis).some(v => v) && (
                  <p className="no-analisis-text">No se seleccionó ningún análisis</p>
                )}
              </div>
            </div>
          )}

          {/* TEXTO DE AVANCE */}
          {reporte.texto_avance && (
            <div className="detalle-section">
              <h3 className="section-title">📝 Avance del Proyecto</h3>
              <p className="avance-texto">{reporte.texto_avance}</p>
            </div>
          )}

          {/* ✅ SECCIÓN UNIFICADA: ELEMENTOS DE TAREAS (Archivos + Evidencias) */}
          <div className="detalle-section">
            <h3 className="section-title">
              <FolderOpen size={18} />
              Elementos de Tareas
              <span className="badge-count">{elementosDeTareas.length}</span>
            </h3>
            {noHayElementosTareas ? (
              <div className="empty-state">
                <p>No hay elementos de tareas seleccionados para este reporte</p>
              </div>
            ) : (
              <div className="elementos-tareas-list">
                {elementosDeTareas.map((item) => (
                  <div key={item.id} className="elemento-tarea-card">
                    <div className="elemento-header">
                      <span className="elemento-icon">{getFileIcon(item.file_name)}</span>
                      <span className="elemento-nombre">{item.file_name || 'Sin nombre'}</span>
                      <span className="elemento-size">{formatFileSize(item.file_size)}</span>
                      <span className="elemento-tarea">📁 {item.tarea_nombre}</span>
                    </div>
                    <div className="elemento-detalles">
                      {item.comment && (
                        <p className="elemento-comment">
                          <strong>Comentario:</strong> {item.comment}
                        </p>
                      )}
                      {item.tarea_descripcion && (
                        <p className="elemento-descripcion">
                          <strong>Descripción de tarea:</strong> {item.tarea_descripcion}
                        </p>
                      )}
                      <span className="elemento-fecha">
                        <Calendar size={14} />
                        {new Date(item.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                    {item.file_url && (
                      <a
                        href={`http://localhost:8000${item.file_url}`}
                        className="btn-download"
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={14} />
                        Descargar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✅ ARCHIVOS SUBIDOS AL REPORTE */}
          <div className="detalle-section">
            <h3 className="section-title">
              <Upload size={18} />
              Archivos Subidos al Reporte
              <span className="badge-count">{archivosSubidos.length}</span>
            </h3>
            {archivosSubidos.length === 0 ? (
              <div className="empty-state">
                <p>No hay archivos subidos al reporte</p>
              </div>
            ) : (
              <div className="archivos-list">
                {archivosSubidos.map((archivo) => {
                  const nombreGuardado = archivo.nombre_guardado || 
                                         archivo.ruta_archivo?.split('/').pop() || 
                                         archivo.ruta?.split('/').pop() || 
                                         '';
                  const urlDescarga = `http://localhost:8000/uploads/reportes/${reporteId}/${nombreGuardado}`;
                  
                  return (
                    <div key={archivo.id} className="archivo-row">
                      <div className="archivo-info">
                        <span className="archivo-icon">{getFileIcon(archivo.nombre_original || archivo.nombre)}</span>
                        <span className="archivo-name">{archivo.nombre_original || archivo.nombre || 'Sin nombre'}</span>
                        <span className="archivo-size">{formatFileSize(archivo.tamaño_bytes || archivo.tamaño)}</span>
                        <span className="archivo-origen">📌 Subido en reporte</span>
                      </div>
                      <a
                        href={urlDescarga}
                        className="btn-download"
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={14} />
                        Descargar
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ANÁLISIS EJECUTADOS */}
          {reporte.analisis && reporte.analisis.length > 0 && (
            <div className="detalle-section">
              <h3 className="section-title">
                <BarChart3 size={18} />
                Resultados de Análisis
              </h3>
              <div className="analisis-resultados">
                {reporte.analisis.map((analisis) => (
                  <div key={analisis.id} className="analisis-resultado-card">
                    <div className="analisis-resultado-header">
                      {getAnalisisIcon(analisis.tipo_analisis)}
                      <span className="analisis-resultado-nombre">
                        {analisis.nombre || getAnalisisNombre(analisis.tipo_analisis)}
                      </span>
                      {analisis.tiempo_ejecucion_ms && (
                        <span className="analisis-tiempo">
                          {analisis.tiempo_ejecucion_ms}ms
                        </span>
                      )}
                    </div>
                    {analisis.descripcion && (
                      <p className="analisis-resultado-desc">{analisis.descripcion}</p>
                    )}
                    {analisis.grafica_principal && (
                      <div className="analisis-grafica">
                        <img src={analisis.grafica_principal} alt="Gráfica de análisis" />
                      </div>
                    )}
                    {analisis.resultados && (
                      <div className="analisis-resultados-json">
                        <pre>{JSON.stringify(analisis.resultados, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PREGUNTA AL CLIENTE */}
          {reporte.pregunta_cliente && (
            <div className="detalle-section">
              <h3 className="section-title">❓ Pregunta para el Cliente</h3>
              <div className="pregunta-box">
                <p>{reporte.pregunta_cliente}</p>
              </div>
            </div>
          )}

          {/* BOTONES DE ACCIÓN */}
          <div className="detalle-actions">
            <button
              onClick={() => navigate(`/reportes/crear/${reporte.project_id}`)}
              className="btn-action btn-action-primary"
            >
              <Edit size={16} />
              Editar Reporte
            </button>
            <button
              onClick={() => window.print()}
              className="btn-action btn-action-secondary"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DetalleReporte;