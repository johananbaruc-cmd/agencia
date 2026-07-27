import  api  from './api';

export const reporteService = {
  // ==========================================
  // REPORTES
  // ==========================================
  
  // Crear un nuevo reporte
  crear: async (data) => {
    const response = await api.post('/reportes', data);
    return response.data;
  },

  // Listar reportes de un proyecto
  listarPorProyecto: async (projectId, skip = 0, limit = 100) => {
    const response = await api.get(`/proyectos/${projectId}/reportes`, {
      params: { skip, limit }
    });
    return response.data;
  },

  // Obtener un reporte por ID
  obtener: async (reporteId, incluirDetalles = true) => {
    const response = await api.get(`/reportes/${reporteId}`, {
      params: { incluir_detalles: incluirDetalles }
    });
    return response.data;
  },

  // Actualizar un reporte
  actualizar: async (reporteId, data) => {
    const response = await api.put(`/reportes/${reporteId}`, data);
    return response.data;
  },

  // Publicar un reporte
  publicar: async (reporteId, data) => {
    const response = await api.post(`/reportes/${reporteId}/publicar`, data);
    return response.data;
  },

  // Eliminar un reporte
  eliminar: async (reporteId) => {
    const response = await api.delete(`/reportes/${reporteId}`);
    return response.data;
  },

  // Obtener resumen del proyecto
  obtenerResumen: async (reporteId) => {
    const response = await api.get(`/reportes/${reporteId}/resumen`);
    return response.data;
  },

  // ==========================================
  // ARCHIVOS
  // ==========================================
  
  // Subir archivo a reporte
  subirArchivo: async (reporteId, archivo, descripcion = '', esGrafica = false) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (descripcion) formData.append('descripcion', descripcion);
    if (esGrafica) formData.append('es_grafica', 'true');

    const response = await api.post(`/reportes/${reporteId}/archivos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Listar archivos de un reporte
  listarArchivos: async (reporteId, soloGraficas = false) => {
    const response = await api.get(`/reportes/${reporteId}/archivos`, {
      params: { solo_graficas: soloGraficas }
    });
    return response.data;
  },

  // Eliminar archivo
  eliminarArchivo: async (archivoId) => {
    const response = await api.delete(`/reportes/archivos/${archivoId}`);
    return response.data;
  },

  // ==========================================
  // ANÁLISIS
  // ==========================================
  
  // Ejecutar análisis
  ejecutarAnalisis: async (reporteId, configuracion) => {
    const response = await api.post(`/reportes/${reporteId}/analisis`, configuracion);
    return response.data;
  },

  // Obtener análisis de un reporte
  obtenerAnalisis: async (reporteId) => {
    const response = await api.get(`/reportes/${reporteId}/analisis`);
    return response.data;
  },

  // Obtener un análisis específico
  obtenerAnalisisPorId: async (analisisId) => {
    const response = await api.get(`/reportes/analisis/${analisisId}`);
    return response.data;
  },

  // Eliminar análisis
  eliminarAnalisis: async (analisisId) => {
    const response = await api.delete(`/reportes/analisis/${analisisId}`);
    return response.data;
  },

  // ==========================================
  // CONFIGURACIONES DE ANÁLISIS
  // ==========================================
  
  // Configurar PCA
  configurarPCA: async (reporteId, config) => {
    const response = await api.post(`/reportes/${reporteId}/analisis/pca`, config);
    return response.data;
  },

  // Configurar Regresión
  configurarRegresion: async (reporteId, config) => {
    const response = await api.post(`/reportes/${reporteId}/analisis/regresion`, config);
    return response.data;
  },

  // Configurar Clustering
  configurarClustering: async (reporteId, config) => {
    const response = await api.post(`/reportes/${reporteId}/analisis/clustering`, config);
    return response.data;
  },

  // Ejecutar Estadísticas
  ejecutarEstadisticas: async (reporteId) => {
    const response = await api.post(`/reportes/${reporteId}/analisis/estadisticas`);
    return response.data;
  }
};