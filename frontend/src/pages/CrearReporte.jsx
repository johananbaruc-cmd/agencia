import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  X, 
  FileText, 
  Check,
  Folder,
  Users,
  BarChart3,
  TrendingUp,
  PieChart,
  Database,
  Eye,
  Calendar,
  CheckSquare,
  AlertCircle,
  Sliders,
  Clock,
  Download,
  File,
  Image,
  FileArchive,
  Trash2
} from 'lucide-react';
import './CrearReporte.css';

const CrearReporte = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cargandoProyectos, setCargandoProyectos] = useState(false);
  const [project, setProject] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [mostrarSelector, setMostrarSelector] = useState(!projectId);
  const [evidencias, setEvidencias] = useState([]);
  const [evidenciasCargando, setEvidenciasCargando] = useState(false);
  const [archivosExistentes, setArchivosExistentes] = useState([]);
  const [archivosExistentesCargando, setArchivosExistentesCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    texto_avance: '',
    pregunta_cliente: '',
    proyecto_seleccionado: projectId || '',
    configuracion_analisis: {
      pca: false,
      regresion: false,
      clustering: false,
      estadisticas: false
    },
    incluir_evidencias: false,
    horas_expiracion: 24
  });
  
  const [archivosNuevos, setArchivosNuevos] = useState([]);
  const [evidenciasSeleccionadas, setEvidenciasSeleccionadas] = useState([]);
  const [archivosExistentesSeleccionados, setArchivosExistentesSeleccionados] = useState([]);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Progreso visual (NO SE GUARDA EN BD)
  const [progresoVisual, setProgresoVisual] = useState(0);

  // Cargar proyectos para el selector
  useEffect(() => {
    const cargarProyectos = async () => {
      setCargandoProyectos(true);
      try {
        const response = await api.get('/projects');
        setProyectos(response.data);
      } catch (error) {
        console.error('Error al cargar proyectos:', error);
      } finally {
        setCargandoProyectos(false);
      }
    };

    if (mostrarSelector) {
      cargarProyectos();
    }
  }, [mostrarSelector]);

  // Cargar proyecto si hay projectId
  useEffect(() => {
    if (projectId) {
      const cargarProyecto = async () => {
        try {
          const response = await api.get(`/projects/${projectId}`);
          setProject(response.data);
          setFormData(prev => ({
            ...prev,
            titulo: `Reporte - ${response.data.name}`,
            proyecto_seleccionado: parseInt(projectId)
          }));
          
          await Promise.all([
            cargarEvidencias(projectId),
            cargarArchivosExistentes(projectId)
          ]);
        } catch (error) {
          console.error('Error al cargar proyecto:', error);
          setError('Error al cargar el proyecto');
        }
      };
      cargarProyecto();
    }
  }, [projectId]);

  // Cargar evidencias de tareas del proyecto
  const cargarEvidencias = async (proyectoId) => {
    setEvidenciasCargando(true);
    try {
      const tasksResponse = await api.get(`/tasks/projects/${proyectoId}/tasks`);
      const tasks = tasksResponse.data;
      
      let allEvidence = [];
      
      for (const task of tasks) {
        try {
          const evidenceResponse = await api.get(`/tasks/${task.id}/evidence`);
          const evidenceWithTask = evidenceResponse.data.map(ev => ({
            ...ev,
            tarea_nombre: task.title,
            tarea_id: task.id,
            tarea_descripcion: task.description || '',
            fecha: ev.created_at,
            fecha_creacion: ev.created_at,
            archivo_nombre: ev.file_name || 'Archivo adjunto',
            descripcion: ev.comment || ev.description || '',
            seleccionada: evidenciasSeleccionadas.includes(ev.id)
          }));
          allEvidence = [...allEvidence, ...evidenceWithTask];
        } catch (error) {
          console.error(`Error cargando evidencia de tarea ${task.id}:`, error);
        }
      }
      
      setEvidencias(allEvidence);
    } catch (error) {
      console.error('Error al cargar evidencias:', error);
      setEvidencias([]);
    } finally {
      setEvidenciasCargando(false);
    }
  };

  // Cargar archivos existentes del proyecto
  const cargarArchivosExistentes = async (proyectoId) => {
    setArchivosExistentesCargando(true);
    try {
      const tasksResponse = await api.get(`/tasks/projects/${proyectoId}/tasks`);
      const tasks = tasksResponse.data;
      
      let allFiles = [];
      for (const task of tasks) {
        try {
          const evidenceResponse = await api.get(`/tasks/${task.id}/evidence`);
          const files = evidenceResponse.data.map(ev => ({
            id: ev.id,
            nombre: ev.file_name || 'Archivo',
            tipo: ev.file_type || 'DESCONOCIDO',
            tamaño: ev.file_size || 0,
            fecha_subida: ev.created_at,
            ruta: ev.file_url,
            archivo_url: ev.file_url,
            tarea_id: task.id,
            tarea_nombre: task.title,
            existe: true,
            seleccionado: archivosExistentesSeleccionados.includes(ev.id)
          }));
          allFiles = [...allFiles, ...files];
        } catch (error) {
          console.error(`Error cargando archivos de tarea ${task.id}:`, error);
        }
      }
      setArchivosExistentes(allFiles);
    } catch (error) {
      console.error('Error al cargar archivos existentes:', error);
      setArchivosExistentes([]);
    } finally {
      setArchivosExistentesCargando(false);
    }
  };

  const handleSeleccionarProyecto = async (e) => {
    const id = parseInt(e.target.value);
    setFormData(prev => ({ ...prev, proyecto_seleccionado: id }));
    
    if (id) {
      try {
        const response = await api.get(`/projects/${id}`);
        setProject(response.data);
        setFormData(prev => ({
          ...prev,
          titulo: `Reporte - ${response.data.name}`
        }));
        await Promise.all([
          cargarEvidencias(id),
          cargarArchivosExistentes(id)
        ]);
        setEvidenciasSeleccionadas([]);
        setArchivosExistentesSeleccionados([]);
      } catch (error) {
        console.error('Error al cargar proyecto:', error);
        setError('Error al cargar el proyecto');
      }
    } else {
      setProject(null);
      setEvidencias([]);
      setArchivosExistentes([]);
      setEvidenciasSeleccionadas([]);
      setArchivosExistentesSeleccionados([]);
      setFormData(prev => ({
        ...prev,
        titulo: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAnalisisChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      configuracion_analisis: {
        ...prev.configuracion_analisis,
        [tipo]: !prev.configuracion_analisis[tipo]
      }
    }));
  };

  // Toggle para seleccionar/deseleccionar evidencia
  const toggleEvidencia = (evidenciaId) => {
    setEvidenciasSeleccionadas(prev => {
      const newSelection = prev.includes(evidenciaId)
        ? prev.filter(id => id !== evidenciaId)
        : [...prev, evidenciaId];
      
      setEvidencias(prevEvidencias => 
        prevEvidencias.map(ev => 
          ev.id === evidenciaId 
            ? { ...ev, seleccionada: !ev.seleccionada }
            : ev
        )
      );
      
      return newSelection;
    });
  };

  // Toggle para seleccionar/deseleccionar archivo existente
  const toggleArchivoExistente = (archivoId) => {
    setArchivosExistentesSeleccionados(prev => {
      const newSelection = prev.includes(archivoId)
        ? prev.filter(id => id !== archivoId)
        : [...prev, archivoId];
      
      setArchivosExistentes(prevArchivos => 
        prevArchivos.map(arch => 
          arch.id === archivoId 
            ? { ...arch, seleccionado: !arch.seleccionado }
            : arch
        )
      );
      
      return newSelection;
    });
  };

  const handleProgresoChange = (e) => {
    const value = parseInt(e.target.value);
    setProgresoVisual(value);
  };

  const handleProgresoInput = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setProgresoVisual(value);
    }
  };

  const getProgressColor = (progreso) => {
    if (progreso < 30) return '#ef4444';
    if (progreso < 60) return '#f59e0b';
    if (progreso < 85) return '#3b82f6';
    return '#10b981';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const projectIdFinal = projectId || formData.proyecto_seleccionado;

      if (!projectIdFinal) {
        setError('Debes seleccionar un proyecto');
        setLoading(false);
        return;
      }

      // SOLO LOS CAMPOS QUE EXISTEN EN EL MODELO
      const reporteData = {
        project_id: parseInt(projectIdFinal),
        admin_id: user?.id,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        texto_avance: formData.texto_avance,
        pregunta_cliente: formData.pregunta_cliente,
        configuracion_analisis: formData.configuracion_analisis,
        horas_expiracion: formData.horas_expiracion,
      };

      // ✅ GUARDAR EVIDENCIAS SELECCIONADAS
      if (formData.incluir_evidencias && evidenciasSeleccionadas.length > 0) {
        reporteData.evidencias_ids = evidenciasSeleccionadas;
      }

      // ✅ GUARDAR ARCHIVOS DE TAREAS SELECCIONADOS (¡CORRECCIÓN IMPORTANTE!)
      if (formData.incluir_evidencias && archivosExistentesSeleccionados.length > 0) {
        reporteData.archivos_existentes_ids = archivosExistentesSeleccionados;
      }

      console.log('📤 Enviando al backend:');
      console.log('  - evidencias_ids:', evidenciasSeleccionadas);
      console.log('  - archivos_existentes_ids:', archivosExistentesSeleccionados);

      // 1. CREAR EL REPORTE
      const response = await api.post('/reportes', reporteData);
      const reporteId = response.data.id;

      // 2. PREPARAR ARCHIVOS PARA SUBIR
      const todosLosArchivos = [];

      // 2a. Archivos nuevos
      todosLosArchivos.push(...archivosNuevos);

      // 2b. Archivos existentes seleccionados (se suben físicamente al reporte)
      if (formData.incluir_evidencias && archivosExistentesSeleccionados.length > 0) {
        const archivosParaSubir = archivosExistentes.filter(
          arch => archivosExistentesSeleccionados.includes(arch.id)
        );

        for (const archivo of archivosParaSubir) {
          if (archivo.archivo_url) {
            try {
              const responseArchivo = await fetch(archivo.archivo_url);
              const blob = await responseArchivo.blob();
              const file = new File([blob], archivo.nombre, { 
                type: blob.type || 'application/octet-stream' 
              });
              todosLosArchivos.push(file);
            } catch (error) {
              console.error(`Error descargando archivo ${archivo.nombre}:`, error);
            }
          }
        }
      }

      // 3. SUBIR TODOS LOS ARCHIVOS
      if (todosLosArchivos.length > 0) {
        for (const archivo of todosLosArchivos) {
          const formDataArchivo = new FormData();
          formDataArchivo.append('archivo', archivo);
          await api.post(`/reportes/${reporteId}/archivos`, formDataArchivo, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      sessionStorage.setItem('evidencias_seleccionadas', JSON.stringify(evidenciasSeleccionadas));
      sessionStorage.setItem('archivos_existentes_seleccionados', JSON.stringify(archivosExistentesSeleccionados));
      sessionStorage.setItem('progreso_visual', String(progresoVisual));
      sessionStorage.setItem('reporte_creado_id', String(reporteId));

      navigate(`/reportes/detalle/${reporteId}`);
    } catch (error) {
      console.error('Error al crear reporte:', error);
      setError(error.response?.data?.detail || 'Error al crear el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setArchivosNuevos(prev => [...prev, ...files]);
  };

  const removeArchivoNuevo = (index) => {
    setArchivosNuevos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    setArchivosNuevos(prev => [...prev, ...files]);
  };

  const getFileIcon = (nombre) => {
    if (!nombre) return '📎';
    const ext = nombre.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📑';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📎';
  };

  const getFileTypeIcon = (nombre) => {
    if (!nombre) return <File size={20} />;
    const ext = nombre.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return <Image size={20} />;
    if (['pdf'].includes(ext)) return <FileText size={20} />;
    if (['doc', 'docx'].includes(ext)) return <FileText size={20} />;
    if (['xls', 'xlsx'].includes(ext)) return <FileText size={20} />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive size={20} />;
    return <File size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const evidenciasSeleccionadasCount = evidenciasSeleccionadas.length;

  return (
    <>
      <Navbar />
      <div className="crear-reporte-container">
        <div className="crear-reporte-inner">
          {/* Botón Volver */}
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowLeft size={18} />
            Volver
          </button>

          {/* Título */}
          <div className="crear-reporte-title">
            <h1>Crear Nuevo Reporte</h1>
            <p>
              {project ? (
                <>Proyecto: <span className="project-name">{project.name}</span></>
              ) : (
                'Selecciona un proyecto para generar el reporte'
              )}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="reporte-form">
            
            {/* ========================================== */}
            {/* SELECCIONAR PROYECTO */}
            {/* ========================================== */}
            {!projectId && (
              <div className="form-group">
                <label>
                  Proyecto <span className="required">*</span>
                </label>
                <div className="selector-proyecto">
                  <Folder size={18} className="selector-icon" />
                  <select
                    value={formData.proyecto_seleccionado}
                    onChange={handleSeleccionarProyecto}
                    className="form-input form-select"
                    required
                    disabled={cargandoProyectos}
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.status === 'completed' ? 'Completado' : p.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                      </option>
                    ))}
                  </select>
                </div>
                {cargandoProyectos && (
                  <p className="input-hint">Cargando proyectos...</p>
                )}
              </div>
            )}

            {/* Proyecto seleccionado */}
            {project && (
              <div className="proyecto-seleccionado">
                <div className="proyecto-info">
                  <Folder size={18} className="proyecto-icon" />
                  <div>
                    <span className="proyecto-label">Proyecto seleccionado</span>
                    <span className="proyecto-nombre">{project.name}</span>
                  </div>
                </div>
                <div className="proyecto-detalle">
                  <span>
                    <Users size={14} />
                    {project.members_count || 0} empleados
                  </span>
                  <span>
                    <BarChart3 size={14} />
                    {project.progress || 0}% avance
                  </span>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TÍTULO */}
            {/* ========================================== */}
            <div className="form-group">
              <label>
                Título del Reporte <span className="required">*</span>
              </label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Ej: Avance - Construcción Plaza Central"
              />
            </div>

            {/* ========================================== */}
            {/* DESCRIPCIÓN */}
            {/* ========================================== */}
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={2}
                className="form-input form-textarea"
                placeholder="Breve descripción del reporte..."
              />
            </div>

            {/* ========================================== */}
            {/* TEXTO DE AVANCE */}
            {/* ========================================== */}
            <div className="form-group">
              <label>Texto de Avance</label>
              <textarea
                name="texto_avance"
                value={formData.texto_avance}
                onChange={handleChange}
                rows={4}
                className="form-input form-textarea"
                placeholder="Describe el avance del proyecto, logros, próximos pasos..."
              />
            </div>

            {/* ========================================== */}
            {/* PREGUNTA PARA EL CLIENTE */}
            {/* ========================================== */}
            <div className="form-group">
              <label>Pregunta para el Cliente</label>
              <textarea
                name="pregunta_cliente"
                value={formData.pregunta_cliente}
                onChange={handleChange}
                rows={2}
                className="form-input form-textarea"
                placeholder="¿Qué quieres preguntar al cliente?"
              />
            </div>

            {/* ========================================== */}
            {/* ⏰ EXPIRACIÓN */}
            {/* ========================================== */}
            <div className="form-group">
              <div className="expiracion-container">
                <div className="expiracion-header">
                  <label className="expiracion-label">
                    <Clock size={18} />
                    Tiempo de expiración del código
                  </label>
                  <span className="expiracion-hint">
                    El código será válido por el número de horas que selecciones
                  </span>
                </div>
                <div className="expiracion-selector">
                  <select
                    name="horas_expiracion"
                    value={formData.horas_expiracion}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value={1}>1 hora</option>
                    <option value={2}>2 horas</option>
                    <option value={4}>4 horas</option>
                    <option value={8}>8 horas</option>
                    <option value={12}>12 horas</option>
                    <option value={24}>24 horas (por defecto)</option>
                    <option value={48}>48 horas (2 días)</option>
                    <option value={72}>72 horas (3 días)</option>
                    <option value={168}>168 horas (7 días)</option>
                    <option value={336}>336 horas (14 días)</option>
                    <option value={720}>720 horas (30 días)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* BARRA DE PROGRESO VISUAL */}
            {/* ========================================== */}
            <div className="form-group">
              <div className="progreso-visual-container">
                <div className="progreso-visual-header">
                  <label className="progreso-visual-label">
                    <Sliders size={18} />
                    Progreso 
                  </label>
                  <span className="progreso-visual-hint">
                    (Solo visual - no se guarda en el reporte)
                  </span>
                </div>
                
                <div className="progreso-visual-control">
                  <div className="progreso-slider-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progresoVisual}
                      onChange={handleProgresoChange}
                      className="progreso-slider"
                      style={{
                        background: `linear-gradient(to right, ${getProgressColor(progresoVisual)} 0%, ${getProgressColor(progresoVisual)} ${progresoVisual}%, rgba(255,255,255,0.1) ${progresoVisual}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                    <div className="progreso-value-input">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={progresoVisual}
                        onChange={handleProgresoInput}
                        className="progreso-number-input"
                      />
                      <span className="progreso-percent">%</span>
                    </div>
                  </div>
                  
                  <div className="progreso-barra-visual">
                    <div className="progreso-barra-container">
                      <div 
                        className="progreso-barra-fill" 
                        style={{ 
                          width: `${progresoVisual}%`,
                          background: `linear-gradient(90deg, ${getProgressColor(progresoVisual)}, ${getProgressColor(progresoVisual)}dd)`
                        }}
                      />
                    </div>
                    <span className="progreso-barra-texto">{progresoVisual}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* ANÁLISIS DE DATOS */}
            {/* ========================================== */}
            <div className="form-group">
              <label>Análisis de Datos</label>
              <p className="field-hint">Selecciona los análisis que deseas incluir en el reporte</p>
              <div className="analisis-grid">
                <label className={`analisis-option ${formData.configuracion_analisis.pca ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.configuracion_analisis.pca}
                    onChange={() => handleAnalisisChange('pca')}
                  />
                  <TrendingUp size={16} />
                  PCA
                  <span className="analisis-desc">Reducción de dimensionalidad</span>
                </label>
                <label className={`analisis-option ${formData.configuracion_analisis.regresion ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.configuracion_analisis.regresion}
                    onChange={() => handleAnalisisChange('regresion')}
                  />
                  <BarChart3 size={16} />
                  Regresión
                  <span className="analisis-desc">Predicción de tendencias</span>
                </label>
                <label className={`analisis-option ${formData.configuracion_analisis.clustering ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.configuracion_analisis.clustering}
                    onChange={() => handleAnalisisChange('clustering')}
                  />
                  <PieChart size={16} />
                  Clustering
                  <span className="analisis-desc">Agrupación de datos</span>
                </label>
                <label className={`analisis-option ${formData.configuracion_analisis.estadisticas ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.configuracion_analisis.estadisticas}
                    onChange={() => handleAnalisisChange('estadisticas')}
                  />
                  <Database size={16} />
                  Estadísticas
                  <span className="analisis-desc">Análisis descriptivo</span>
                </label>
              </div>
            </div>

            {/* ========================================== */}
            {/* ✅ EVIDENCIAS DE TAREAS */}
            {/* ========================================== */}
            {project && (
              <div className="form-group">
                <div className="seccion-header">
                  <label>Evidencias de Tareas</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      name="incluir_evidencias"
                      checked={formData.incluir_evidencias}
                      onChange={handleChange}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Incluir en el reporte</span>
                  </label>
                </div>
                
                {formData.incluir_evidencias && (
                  <>
                    {evidenciasCargando ? (
                      <div className="evidencias-loading">
                        <div className="loading-spinner-small"></div>
                        <p>Cargando evidencias...</p>
                      </div>
                    ) : evidencias.length === 0 ? (
                      <div className="evidencias-empty">
                        <AlertCircle size={24} />
                        <p>No hay evidencias disponibles en las tareas de este proyecto</p>
                      </div>
                    ) : (
                      <>
                        <div className="evidencias-resumen">
                          <span>
                            <CheckSquare size={16} />
                            {evidenciasSeleccionadasCount} de {evidencias.length} evidencias seleccionadas
                          </span>
                          {evidenciasSeleccionadasCount > 0 && (
                            <button
                              type="button"
                              className="btn-seleccionar-todas"
                              onClick={() => {
                                if (evidenciasSeleccionadasCount === evidencias.length) {
                                  setEvidenciasSeleccionadas([]);
                                  setEvidencias(prev => prev.map(ev => ({ ...ev, seleccionada: false })));
                                } else {
                                  const allIds = evidencias.map(e => e.id);
                                  setEvidenciasSeleccionadas(allIds);
                                  setEvidencias(prev => prev.map(ev => ({ ...ev, seleccionada: true })));
                                }
                              }}
                            >
                              {evidenciasSeleccionadasCount === evidencias.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                            </button>
                          )}
                        </div>

                        <div className="evidencias-grid">
                          {evidencias.map((evidencia) => {
                            const isSelected = evidenciasSeleccionadas.includes(evidencia.id);
                            
                            return (
                              <div 
                                key={evidencia.id} 
                                className={`evidencia-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleEvidencia(evidencia.id)}
                              >
                                <div className="evidencia-check">
                                  {isSelected ? (
                                    <Check size={16} className="check-icon" />
                                  ) : (
                                    <div className="check-empty" />
                                  )}
                                </div>
                                <div className="evidencia-contenido">
                                  <div className="evidencia-header">
                                    <span className="evidencia-tarea">
                                      <CheckSquare size={14} />
                                      {evidencia.tarea_nombre || 'Tarea sin nombre'}
                                    </span>
                                    <span className="evidencia-fecha">
                                      <Calendar size={12} />
                                      {new Date(evidencia.fecha_creacion || evidencia.fecha).toLocaleDateString('es-MX')}
                                    </span>
                                  </div>
                                  {evidencia.tarea_descripcion && (
                                    <p className="evidencia-descripcion">{evidencia.tarea_descripcion}</p>
                                  )}
                                  <div className="evidencia-archivo">
                                    <FileText size={12} />
                                    <span>{evidencia.archivo_nombre || 'Archivo adjunto'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* 📎 ARCHIVOS EXISTENTES */}
            {/* ========================================== */}
            {project && formData.incluir_evidencias && archivosExistentes.length > 0 && (
              <div className="form-group">
                <div className="seccion-header">
                  <label>Archivos de las Tareas</label>
                  <span className="seccion-subtitle">
                    {archivosExistentesSeleccionados.length} de {archivosExistentes.length} seleccionados
                  </span>
                </div>
                
                <div className="archivos-existentes-grid">
                  {archivosExistentes.map((archivo) => {
                    const isSelected = archivosExistentesSeleccionados.includes(archivo.id);
                    
                    return (
                      <div 
                        key={archivo.id} 
                        className={`archivo-existente-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleArchivoExistente(archivo.id)}
                      >
                        <div className="archivo-check">
                          {isSelected ? (
                            <Check size={16} className="check-icon" />
                          ) : (
                            <div className="check-empty" />
                          )}
                        </div>
                        <div className="archivo-info">
                          <span className="archivo-icon">{getFileTypeIcon(archivo.nombre)}</span>
                          <div className="archivo-detalle">
                            <span className="archivo-nombre">{archivo.nombre}</span>
                            <span className="archivo-meta">
                              {archivo.tipo} • {formatFileSize(archivo.tamaño)}
                              {archivo.tarea_nombre && (
                                <span className="archivo-tarea">📁 {archivo.tarea_nombre}</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {archivosExistentesCargando && (
                  <p className="input-hint">Cargando archivos...</p>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* 📤 SUBIR ARCHIVOS NUEVOS */}
            {/* ========================================== */}
            <div className="form-group">
              <label>Subir Archivos Nuevos</label>
              <p className="field-hint">Sube archivos adicionales para el reporte (opcional)</p>
              <div
                className={`upload-zone ${dragActive ? 'dragging' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="upload-label">
                  <div className="upload-icon">
                    <Upload size={32} />
                  </div>
                  <p>Arrastra o haz clic para subir archivos</p>
                  <span className="upload-hint">PDF, Word, Excel, Imagenes (max 50MB)</span>
                </label>
              </div>

              {archivosNuevos.length > 0 && (
                <div className="archivos-lista">
                  {archivosNuevos.map((archivo, index) => (
                    <div key={index} className="archivo-item">
                      <div className="archivo-info">
                        <span className="archivo-icon">{getFileTypeIcon(archivo.name)}</span>
                        <span className="archivo-nombre">{archivo.name}</span>
                        <span className="archivo-size">{formatFileSize(archivo.size)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeArchivoNuevo(index)}
                        className="btn-remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ========================================== */}
            {/* BOTONES */}
            {/* ========================================== */}
            <div className="form-actions">
              <button
                type="submit"
                disabled={loading || !project}
                className="btn-submit"
              >
                <Save size={18} />
                {loading ? 'Guardando...' : 'Guardar Reporte'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-cancel"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CrearReporte;