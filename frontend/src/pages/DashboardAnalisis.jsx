import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Users, Briefcase, CheckSquare, Clock, CheckCircle, TrendingUp, Activity,
  BarChart3, Loader2, Info, XCircle
} from 'lucide-react';
import './DashboardAnalisis.css';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RePieChart, Pie, Cell,
  LineChart, Line, Area,
  ComposedChart, Scatter, ScatterChart, ResponsiveContainer, ReferenceLine
} from 'recharts';

// ============================================================
// COLORES
// ============================================================
const COLORS = {
  pie: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF4444', '#A78BFA', '#F472B6', '#34D399'],
  priority: {
    urgent: '#EF4444',
    high: '#F97316',
    medium: '#EAB308',
    low: '#22C55E'
  }
};

// ============================================================
// MAPEO DE PRIORIDADES
// ============================================================
const NOMBRES_PRIORIDADES = {
  'TaskPriority.LOW': 'Baja',
  'TaskPriority.MEDIUM': 'Media',
  'TaskPriority.HIGH': 'Alta',
  'TaskPriority.URGENT': 'Urgente',
  'low': 'Baja',
  'medium': 'Media',
  'high': 'Alta',
  'urgent': 'Urgente',
  'LOW': 'Baja',
  'MEDIUM': 'Media',
  'HIGH': 'Alta',
  'URGENT': 'Urgente'
};

const COLORES_PRIORIDADES = {
  'TaskPriority.LOW': '#22C55E',
  'TaskPriority.MEDIUM': '#EAB308',
  'TaskPriority.HIGH': '#F97316',
  'TaskPriority.URGENT': '#EF4444',
  'low': '#22C55E',
  'medium': '#EAB308',
  'high': '#F97316',
  'urgent': '#EF4444',
  'LOW': '#22C55E',
  'MEDIUM': '#EAB308',
  'HIGH': '#F97316',
  'URGENT': '#EF4444'
};

const ORDEN_PRIORIDADES = {
  'TaskPriority.URGENT': 0,
  'urgent': 0,
  'URGENT': 0,
  'TaskPriority.HIGH': 1,
  'high': 1,
  'HIGH': 1,
  'TaskPriority.MEDIUM': 2,
  'medium': 2,
  'MEDIUM': 2,
  'TaskPriority.LOW': 3,
  'low': 3,
  'LOW': 3
};

function procesarPrioridades(data) {
  if (!data || data.length === 0) return [];
  
  return data
    .map(item => {
      const clave = item.name;
      return {
        ...item,
        nombreBonito: NOMBRES_PRIORIDADES[clave] || clave,
        clave: clave,
        color: COLORES_PRIORIDADES[clave] || '#8884d8'
      };
    })
    .sort((a, b) => {
      const ordenA = ORDEN_PRIORIDADES[a.clave] ?? 99;
      const ordenB = ORDEN_PRIORIDADES[b.clave] ?? 99;
      return ordenA - ordenB;
    });
}

// ============================================================
// TEMAS Y HELPERS
// ============================================================
const getTooltipTheme = (isDark) => ({
  contentStyle: {
    background: isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
    border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #e2e8f0',
    borderRadius: 8,
    color: isDark ? '#f3f4f6' : '#1a1a2e'
  },
  labelStyle: { color: isDark ? '#9ca3af' : '#64748b' },
  itemStyle: { color: isDark ? '#f3f4f6' : '#1a1a2e' },
});

function alturaDinamica(data, { base = 280, porFila = 34, min = 280, max = 560 } = {}) {
  if (!data || data.length <= 6) return base;
  return Math.min(Math.max(data.length * porFila, min), max);
}

function labelPieSiCabe(data) {
  if (!data || data.length > 4) return false;
  return ({ name, percent }) => (percent < 0.04 ? '' : `${name}: ${(percent * 100).toFixed(0)}%`);
}

// ============================================================
// COMPONENTE DE TEXTO CON MARQUEE
// ============================================================
function TextoConMarquee({ texto, maxLength = 18 }) {
  const [pausado, setPausado] = useState(false);
  
  if (!texto) return <span>Sin nombre</span>;
  if (texto.length <= maxLength) return <span>{texto}</span>;
  
  const textoCompleto = texto;
  const textoVisible = texto.slice(0, maxLength) + '…';
  
  return (
    <div 
      className="marquee-container"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className={`marquee-text ${pausado ? 'pausado' : ''}`}>
        {textoCompleto}
      </div>
      <span className="marquee-label">{textoVisible}</span>
    </div>
  );
}

// ============================================================
// COMPONENTE DE LEYENDA PERSONALIZADA
// ============================================================
function CustomLegend({ items }) {
  if (!items || items.length === 0) return null;
  
  return (
    <div className="custom-legend-horizontal">
      {items.map((item, index) => (
        <div key={index} className="custom-legend-item">
          <span className="custom-legend-dot" style={{ background: item.color }}></span>
          <span className="custom-legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// INTERPRETACIONES
// ============================================================
const INTERPRETACIONES = {
  proyectosEstado: 'Muestra cómo están distribuidos tus proyectos. Te ayuda a saber cuántos están activos, terminados o en espera.',
  tareasPrioridad: 'Agrupa las tareas por su nivel de urgencia. Ideal para saber si hay muchas tareas críticas que requieren atención inmediata.',
  tareasProyecto: 'Compara la carga de trabajo entre proyectos. Puedes ver cuáles tienen más tareas pendientes, en progreso o completadas.',
  horasDiarias: 'Muestra las horas trabajadas cada día con barras, incluye una línea de promedio para identificar días por encima o debajo de la media.',
  prediccionHoras: 'Proyección a 30 días basada en el historial de horas. Ayuda a planificar la carga de trabajo futura.',
  cargaEmpleados: 'Cantidad de tareas por empleado y su eficiencia. Identifica quién tiene más carga o mejor rendimiento.',
  proyectosRiesgo: 'Relaciona el progreso del proyecto con los días restantes. Los puntos rojos son proyectos críticos que necesitan atención.',
  topClientes: 'Los clientes que más presupuesto aportan. Te ayuda a identificar a tus clientes estratégicos.',
  clientesEmpresa: 'Distribución de clientes según la empresa a la que pertenecen. Conoce el sector de tus clientes.'
};

// ============================================================
// FUNCIONES PARA ESTADÍSTICAS DE HORAS
// ============================================================
function calcularPromedio(data) {
  if (!data || data.length === 0) return 0;
  const total = data.reduce((sum, item) => sum + (item.horas || 0), 0);
  return Math.round(total / data.length);
}

function calcularMaximo(data) {
  if (!data || data.length === 0) return 0;
  return Math.max(...data.map(item => item.horas || 0));
}

function calcularMinimo(data) {
  if (!data || data.length === 0) return 0;
  return Math.min(...data.map(item => item.horas || 0));
}

function calcularTotal(data) {
  if (!data || data.length === 0) return 0;
  return Math.round(data.reduce((sum, item) => sum + (item.horas || 0), 0));
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function DashboardAnalisis() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Iniciando...');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [renderReady, setRenderReady] = useState(false);

  // Estados para el Top 3 de empleados (AGREGADOS)
  const [verTodosEmpleados, setVerTodosEmpleados] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  
  // Estado para expandir/contraer la fila de clientes
  const [openCliente, setOpenCliente] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRenderReady(false);

        const steps = [
          { progress: 8, text: 'Conectando a la base de datos...' },
          { progress: 18, text: 'Recopilando métricas de proyectos...' },
          { progress: 30, text: 'Analizando tareas y prioridades...' },
          { progress: 42, text: 'Calculando horas estimadas...' },
          { progress: 55, text: 'Generando predicciones...' },
          { progress: 68, text: 'Preparando visualizaciones...' },
          { progress: 78, text: 'Renderizando gráficas...' },
          { progress: 88, text: 'Cargando paneles...' },
          { progress: 95, text: 'Finalizando dashboard...' },
        ];

        for (const step of steps) {
          setLoadingProgress(step.progress);
          setLoadingText(step.text);
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        const response = await api.get('/analisis/dashboard?actualizar=true');
        setData(response.data);

        setLoadingProgress(100);
        setLoadingText('Listo!');

        await new Promise(resolve => setTimeout(resolve, 2000));

        setRenderReady(true);
        setLoading(false);

      } catch (error) {
        console.error('Error al cargar datos:', error);
        setMessage({
          text: error.response?.data?.detail || 'Error al cargar datos del dashboard',
          type: 'error'
        });
        setLoading(false);
        setRenderReady(true);
      }
    };
    fetchData();
  }, []);

  // Tooltip para nombres en el eje Y
  useEffect(() => {
    let tooltip = document.querySelector('.marquee-axis-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'marquee-axis-tooltip';
      document.body.appendChild(tooltip);
    }

    const handleMouseEnter = (e) => {
      const target = e.target.closest('.marquee-axis-container');
      if (!target) return;
      
      const text = target.getAttribute('data-tooltip');
      if (!text) return;
      
      const rect = target.getBoundingClientRect();
      tooltip.textContent = text;
      tooltip.classList.add('visible');
      
      let left = rect.left;
      let top = rect.top - 35;
      
      if (left + 400 > window.innerWidth) {
        left = window.innerWidth - 420;
      }
      if (top < 10) {
        top = rect.bottom + 10;
      }
      
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    };

    const handleMouseLeave = () => {
      tooltip.classList.remove('visible');
    };

    const containers = document.querySelectorAll('.marquee-axis-container');
    containers.forEach(container => {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      containers.forEach(container => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      });
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [data]);

  const tooltipTheme = getTooltipTheme(true);

  // ============================================================
  // LOADING
  // ============================================================
  if (loading || !renderReady || !data) {
    return (
      <>
        <Navbar />
        <div className="orb orb-blue"></div>
        <div className="orb orb-cyan"></div>
        <div className="bg-gradient"></div>
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-icon">
              <BarChart3 size={40} />
            </div>
            <div className="loading-bar-wrapper">
              <div className="loading-bar-track">
                <div
                  className="loading-bar-fill"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="loading-percentage">{loadingProgress}%</div>
            </div>
            <div className="loading-text">
              <Loader2 size={16} className="loading-spinner-icon" />
              <span>{loadingText}</span>
            </div>
            <div className="loading-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // DATOS DESDE LA API
  // ============================================================
  const kpis = data?.kpis || {
    totalProyectos: 0,
    totalEmpleados: 0,
    totalClientes: 0,
    tareasPendientes: 0,
    tareasCompletadas: 0,
    proyectosActivos: 0,
    horasTotales: 0
  };

  const proyectosPorEstado = data?.proyectosPorEstado || [];
  const tareasPorPrioridad = data?.tareasPorPrioridad || [];
  const tareasPorProyecto = data?.tareasPorProyecto || [];
  const horasDiarias = data?.horasDiarias || [];
  const prediccionHoras = data?.prediccionHoras || [];
  const cargaEmpleados = data?.cargaEmpleados || [];
  const proyectosRiesgo = data?.proyectosRiesgo || [];
  const topClientes = data?.topClientes || [];
  const clientesIndustria = data?.clientesIndustria || [];

  // Ordenar por entregas anticipadas (o completadas si no existe esa variable)
  const empleadosOrdenados = [...cargaEmpleados].sort((a, b) => {
    const aEntregas = a.entregasAnticipadas || a.completadas || 0;
    const bEntregas = b.entregasAnticipadas || b.completadas || 0;
    return bEntregas - aEntregas;
  });

  const fechaHoyMarcador = prediccionHoras.length > 0 ? prediccionHoras[Math.floor(prediccionHoras.length / 2)]?.fecha : null;

  const promedioHoras = calcularPromedio(horasDiarias);
  const maxHoras = calcularMaximo(horasDiarias);
  const minHoras = calcularMinimo(horasDiarias);
  const totalHoras = calcularTotal(horasDiarias);

  // Leyendas personalizadas
  const legendTareasProyecto = [
    { label: 'Completadas', color: '#22C55E' },
    { label: 'En Progreso', color: '#3B82F6' },
    { label: 'Pendientes', color: '#F97316' }
  ];

  const legendCargaEmpleados = [
    { label: 'Pendientes', color: '#FF4444' },
    { label: 'En Progreso', color: '#FFBB28' },
    { label: 'Completadas', color: '#00C49F' }
  ];

  const legendPrediccion = [
    { label: 'Horas estimadas', color: '#0088FE' },
    { label: 'Tendencia (regresion)', color: '#FF8042' }
  ];

  return (
    <>
      <Navbar />

      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

      <div className="dashboard-analisis">

        {message.text && (
          <div className={`message-floating ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* HEADER */}
        <div className="dashboard-header-glass">
          <div className="dashboard-header-content">
            <div className="dashboard-title">
              <div className="dashboard-title-icon">
                <BarChart3 size={28} />
              </div>
              <div>
                <h1>Panel de Analisis</h1>
                <p>Visualizacion completa de metricas, tendencias y predicciones</p>
              </div>
            </div>
            <div className="dashboard-header-actions">
              <button className="btn-refresh" onClick={() => window.location.reload()}>
                <Activity size={16} />
                Actualizar
              </button>
              <span className="dashboard-date">
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" style={{ borderColor: '#0088FE' }}>
            <div className="kpi-icon" style={{ background: 'rgba(0, 136, 254, 0.15)', color: '#0088FE' }}>
              <Briefcase size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpis.totalProyectos}</span>
              <span className="kpi-label">Proyectos Totales</span>
            </div>
          </div>
          <div className="kpi-card" style={{ borderColor: '#00C49F' }}>
            <div className="kpi-icon" style={{ background: 'rgba(0, 196, 159, 0.15)', color: '#00C49F' }}>
              <Users size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpis.totalEmpleados}</span>
              <span className="kpi-label">Empleados</span>
            </div>
          </div>
          <div className="kpi-card" style={{ borderColor: '#FFBB28' }}>
            <div className="kpi-icon" style={{ background: 'rgba(255, 187, 40, 0.15)', color: '#FFBB28' }}>
              <CheckSquare size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpis.tareasPendientes}</span>
              <span className="kpi-label">Tareas Pendientes</span>
            </div>
          </div>
          <div className="kpi-card" style={{ borderColor: '#FF8042' }}>
            <div className="kpi-icon" style={{ background: 'rgba(255, 128, 66, 0.15)', color: '#FF8042' }}>
              <Clock size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpis.horasTotales}h</span>
              <span className="kpi-label">Horas Totales</span>
            </div>
          </div>
          <div className="kpi-card" style={{ borderColor: '#34D399' }}>
            <div className="kpi-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34D399' }}>
              <CheckCircle size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpis.tareasCompletadas}</span>
              <span className="kpi-label">Tareas Completadas</span>
            </div>
          </div>
          <div className="kpi-card" style={{ borderColor: '#A78BFA' }}>
            <div className="kpi-icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA' }}>
              <TrendingUp size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpis.proyectosActivos}</span>
              <span className="kpi-label">Proyectos Activos</span>
            </div>
          </div>
        </div>

        {/* FILA 1: Proyectos por Estado + Tareas por Prioridad */}
        <div className="chart-row">
          <div className="chart-card">
            <h3>Proyectos por Estado</h3>
            <div className="chart-interpretation">
              <Info size={14} className="interpretacion-icon" />
              {INTERPRETACIONES.proyectosEstado}
            </div>
            {proyectosPorEstado.length === 0 ? (
              <div className="empty-chart">No hay proyectos registrados</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RePieChart>
                  <Pie
                    data={proyectosPorEstado}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={labelPieSiCabe(proyectosPorEstado)}
                  >
                    {proyectosPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipTheme} />
                  <Legend 
                    wrapperStyle={{ fontSize: 12, color: '#f0f9ff' }}
                    formatter={(value) => <TextoConMarquee texto={value} maxLength={14} />}
                  />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <h3>Tareas por Prioridad</h3>
            <div className="chart-interpretation">
              <Info size={14} className="interpretacion-icon" />
              {INTERPRETACIONES.tareasPrioridad}
              <span className="priority-badge urgent">Urgente</span>
              <span className="priority-badge high">Alta</span>
              <span className="priority-badge medium">Media</span>
              <span className="priority-badge low">Baja</span>
            </div>
            
            {tareasPorPrioridad.length === 0 ? (
              <div className="empty-chart">No hay tareas registradas</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart 
                  data={procesarPrioridades(tareasPorPrioridad)}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="nombreBonito" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                    label={{ 
                      value: 'Nivel de Prioridad', 
                      position: 'bottom',
                      fill: '#94a3b8',
                      fontSize: 12,
                      fontWeight: 500,
                      offset: 20
                    }}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                    label={{ 
                      value: 'Cantidad de Tareas', 
                      angle: -90, 
                      position: 'insideLeft',
                      fill: '#94a3b8',
                      fontSize: 12,
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip 
                    {...tooltipTheme}
                    formatter={(value) => `${value} tarea${value !== 1 ? 's' : ''}`}
                    labelFormatter={(label) => `Prioridad: ${label}`}
                  />
                  <Bar 
                    dataKey="value" 
                    name=""
                    radius={[4, 4, 0, 0]}
                  >
                    {procesarPrioridades(tareasPorPrioridad).map((entry) => (
                      <Cell
                        key={`cell-${entry.clave}`}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
{/* FILA 2: Tareas por Proyecto - CON LEYENDA SEPARADA */}
        <div className="chart-row">
          <div className="chart-card full-width">
            <h3>Tareas por Proyecto</h3>
            <div className="chart-interpretation">
              <Info size={14} className="interpretacion-icon" />
              {INTERPRETACIONES.tareasProyecto}
            </div>
            {tareasPorProyecto.length === 0 ? (
              <div className="empty-chart">No hay tareas asignadas a proyectos</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(280, tareasPorProyecto.filter(p => (p.completadas || 0) + (p.enProgreso || 0) + (p.pendientes || 0) > 0).length * 45)}>
                  <BarChart 
                    data={tareasPorProyecto.filter(p => (p.completadas || 0) + (p.enProgreso || 0) + (p.pendientes || 0) > 0)} 
                    layout="vertical" 
                    margin={{ left: 25, right: 30, top: 10, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" horizontal={false} />
                    
                    <XAxis 
                      type="number" 
                      allowDecimals={false} 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: '#4a5568' }}
                      tickLine={{ stroke: '#4a5568' }}
                      label={{ 
                        value: 'Numero de Tareas', 
                        position: 'bottom',
                        fill: '#94a3b8',
                        fontSize: 12,
                        fontWeight: 500,
                        offset: 20
                      }}
                    />
                    
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={210}
                      stroke="#9ca3af"
                      tick={({ x, y, payload }) => {
                        const texto = payload.value || '';
                        const maxLength = 22;
                        
                        if (!texto) return null;
                        
                        const textoVisible = texto.length > maxLength ? texto.slice(0, maxLength) + '…' : texto;
                        
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <foreignObject x={-205} y={-10} width={200} height={24}>
                              <div 
                                className="marquee-axis-container"
                                data-tooltip={texto}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  overflow: 'hidden',
                                  position: 'relative',
                                  color: '#e2e8f0',
                                  fontSize: '12.5px',
                                  lineHeight: '24px',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                <span style={{ 
                                  position: 'absolute', 
                                  left: 0, 
                                  top: 0, 
                                  color: '#e2e8f0',
                                  fontWeight: 500
                                }}>
                                  {textoVisible}
                                </span>
                              </div>
                            </foreignObject>
                          </g>
                        );
                      }}
                    />
                    
                    <Tooltip 
                      {...tooltipTheme} 
                      labelFormatter={(v) => v}
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: 8,
                        color: '#f3f4f6'
                      }}
                    />
                    
                    {/* Barras con colores */}
                    <Bar 
                      dataKey="completadas" 
                      stackId="a" 
                      fill="#22C55E" 
                      name="Completadas" 
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      dataKey="enProgreso" 
                      stackId="a" 
                      fill="#3B82F6" 
                      name="En Progreso" 
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      dataKey="pendientes" 
                      stackId="a" 
                      fill="#F97316" 
                      name="Pendientes" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Leyenda personalizada debajo */}
                <CustomLegend items={legendTareasProyecto} />
              </>
            )}
          </div>
        </div>

        
       {/* FILA 3: Horas Trabajadas + Prediccion - CON LEYENDAS CORREGIDAS */}
<div className="chart-row">
  <div className="chart-card">
    <h3>Horas Trabajadas por Dia</h3>
    <div className="chart-interpretation">
      <Info size={14} className="interpretacion-icon" />
      {INTERPRETACIONES.horasDiarias}
    </div>
    {horasDiarias.length === 0 ? (
      <div className="empty-chart">No hay evidencias aprobadas</div>
    ) : (
      <>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={horasDiarias}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            
            <XAxis 
              dataKey="fecha" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              label={{ 
                value: 'Fecha (Dia/Mes)', 
                position: 'bottom',
                fill: '#94a3b8',
                fontSize: 12,
                fontWeight: 500,
                offset: 15
              }}
            />
            
            <YAxis 
              allowDecimals={false} 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              label={{ 
                value: 'Horas', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
                style: { textAnchor: 'middle' }
              }}
            />
            
            <Tooltip 
              {...tooltipTheme}
              formatter={(value) => `${value} horas`}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            
            {/* LEYENDA DE RECHARTS */}
            <Legend 
              wrapperStyle={{ fontSize: 12, color: '#f0f9ff', paddingBottom: 8 }}
              iconType="circle"
              verticalAlign="top"
              align="center"
            />
            
            <Bar 
              dataKey="horas" 
              fill="#3B82F6" 
              name="Horas trabajadas"
              radius={[4, 4, 0, 0]}
            />
            
            {/* LÍNEA DE PROMEDIO - TEXTO CORREGIDO */}
            <ReferenceLine 
              y={promedioHoras} 
              stroke="#F97316" 
              strokeWidth={2.5}
              strokeDasharray="6 4"
              label={{ 
                value: `Promedio: ${promedioHoras}h`, 
                position: 'insideTopRight',
                fill: '#F97316',
                fontSize: 11,
                fontWeight: 600
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        <div className="horas-stats">
          <div className="stat-item">
            <span className="stat-label">Promedio</span>
            <span className="stat-value">{promedioHoras}h</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Maximo</span>
            <span className="stat-value">{maxHoras}h</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Minimo</span>
            <span className="stat-value">{minHoras}h</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{totalHoras}h</span>
          </div>
        </div>
      </>
    )}
  </div>

  <div className="chart-card">
    <h3>Prediccion de Horas (30 dias)</h3>
    <div className="chart-interpretation">
      <Info size={14} className="interpretacion-icon" />
      {INTERPRETACIONES.prediccionHoras}
    </div>
    {prediccionHoras.length === 0 ? (
      <div className="empty-chart">Datos insuficientes para prediccion</div>
    ) : (
      <>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={prediccionHoras}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            
            <XAxis 
              dataKey="fecha" 
              minTickGap={20} 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              label={{ 
                value: 'Fecha (Dia/Mes)', 
                position: 'bottom',
                fill: '#94a3b8',
                fontSize: 12,
                fontWeight: 500,
                offset: 15
              }}
            />
            
            <YAxis 
              allowDecimals={false} 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              label={{ 
                value: 'Horas', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
                style: { textAnchor: 'middle' }
              }}
            />
            
            <Tooltip 
              {...tooltipTheme}
              formatter={(value, name) => {
                if (name === 'Horas estimadas') return `${value} horas`;
                if (name === 'Tendencia (regresion)') return `${value} horas (prediccion)`;
                return value;
              }}
            />
            
            {fechaHoyMarcador && (
              <ReferenceLine
                x={fechaHoyMarcador}
                stroke="#888"
                strokeDasharray="4 4"
                label={{ value: 'Hoy', position: 'top', fill: '#888', fontSize: 11 }}
              />
            )}
            
            {/* PUNTOS AZULES: Horas estimadas */}
            <Scatter 
              dataKey="horas" 
              fill="#0088FE" 
              name="Horas estimadas" 
              shape="circle"
            />
            
            {/* LÍNEA NARANJA: Tendencia (regresion) con su texto */}
            <Line
              type="linear"
              dataKey="regresion"
              stroke="#FF8042"
              strokeWidth={2.5}
              dot={false}
              name="Tendencia (regresion)"
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Leyenda personalizada para prediccion */}
        <CustomLegend items={legendPrediccion} />
      </>
    )}
  </div>
</div>

                   {/* FILA 4: RANKING DE EMPLEADOS POR EVIDENCIAS APROBADAS */}
        <div className="chart-row">
          <div className="chart-card full-width top-empleados-card">
            <div className="top-empleados-header">
              <div>
                <h3>Ranking de Empleados por Evidencias Aprobadas</h3>
                <div className="chart-interpretation" style={{ marginBottom: 15 }}>
                  <Info size={14} className="interpretacion-icon" />
                  Empleados que han tenido más evidencias aprobadas por el administrador.
                </div>
              </div>
              <button 
                className="btn-ver-mas-modern"
                onClick={() => setVerTodosEmpleados(!verTodosEmpleados)}
              >
                {verTodosEmpleados ? '← Ver menos' : 'Ver todos →'}
              </button>
            </div>

            {cargaEmpleados.length === 0 ? (
              <div className="empty-chart">No hay empleados con evidencias registradas</div>
            ) : (
              <>
                {/* RANKING EN ESCALERA (Top 3 destacados) */}
                <div className="ranking-escalera">
                  {cargaEmpleados.slice(0, 3).map((emp, index) => {
                    const coloresRanking = ['#FFD700', '#A0AEC0', '#D68B4C']; // Oro, Plata, Bronce
                    const titulos = ['1er Lugar', '2do Lugar', '3er Lugar'];
                    
                    return (
                      <div 
                        key={emp.name} 
                        className="ranking-fila"
                        style={{ borderLeftColor: coloresRanking[index] }}
                      >
                        <div className="ranking-medalla" style={{ background: coloresRanking[index] }}>
                          {index + 1}
                        </div>
                        
                        <div className="ranking-info">
                          <span className="ranking-nombre">{emp.name}</span>
                          <span className="ranking-titulo">{titulos[index]}</span>
                        </div>

                        <div className="ranking-datos">
                          <span className="ranking-dato aprobadas">
                            <span className="mini-dot" style={{ background: '#00C49F' }}></span>
                            {emp.aprobadas || 0} Aprobadas
                          </span>
                          <span className="ranking-dato rechazadas">
                            <span className="mini-dot" style={{ background: '#EF4444' }}></span>
                            {emp.rechazadas || 0} Rechazadas
                          </span>
                          <span className="ranking-dato proyectos">
                            <span className="mini-dot" style={{ background: '#3B82F6' }}></span>
                            {emp.proyectosActivos || 0} Proyectos
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* LISTA DE TODOS LOS EMPLEADOS (Si se pulsa Ver todos) */}
                {verTodosEmpleados && (
                  <div className="ranking-lista-completa">
                    {cargaEmpleados.slice(3).map((emp, index) => (
                      <div className="ranking-fila-secundaria" key={emp.name}>
                        <span className="ranking-num-secundario">{index + 4}.</span>
                        <span className="ranking-nombre-secundario">{emp.name}</span>
                        <span className="ranking-datos-secundarios">
                          <span className="ranking-dato aprobadas">
                            <span className="mini-dot" style={{ background: '#00C49F' }}></span>
                            {emp.aprobadas || 0}
                          </span>
                          <span className="ranking-dato rechazadas">
                            <span className="mini-dot" style={{ background: '#EF4444' }}></span>
                            {emp.rechazadas || 0}
                          </span>
                          <span className="ranking-dato proyectos">
                            <span className="mini-dot" style={{ background: '#3B82F6' }}></span>
                            {emp.proyectosActivos || 0}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

                      {/* FILA 5: Proyectos en Riesgo (Con panel de alertas y recomendaciones) */}
        <div className="chart-row">
          <div className="chart-card full-width">
            <h3>Proyectos en Riesgo</h3>
            <div className="chart-interpretation">
              <Info size={14} className="interpretacion-icon" />
              {INTERPRETACIONES.proyectosRiesgo}
            </div>
            {proyectosRiesgo.length === 0 ? (
              <div className="empty-chart">No hay proyectos en riesgo</div>
            ) : (
              <>
                {/* Contenedor con scroll horizontal */}
                <div className="scatter-scroll-container">
                  {/* Ancho fijo calculado: 80px por proyecto, mínimo 700px, máximo 1400px */}
                  <ResponsiveContainer width={Math.min(Math.max(proyectosRiesgo.length * 80, 700), 1400)} height={300}>
                    <ScatterChart margin={{ bottom: 10, right: 50, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      
                      {/* EJE X: Ticks personalizados */}
                      <XAxis 
                        dataKey="indice" 
                        type="number" 
                        domain={[1, 'dataMax']}
                        allowDecimals={false}
                        interval={0}
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                        label={{ 
                          value: 'No. de Proyecto', 
                          position: 'bottom',
                          offset: 15,
                          fill: '#94a3b8',
                          fontSize: 12,
                          fontWeight: 500,
                          style: { textAnchor: 'middle' }
                        }}
                        tickLine={{ stroke: '#9ca3af' }}
                      >
                        {({ x, y, payload }) => (
                          <g transform={`translate(${x},${y})`}>
                            <text 
                              x={0} 
                              y={0} 
                              dy={16} 
                              textAnchor="middle" 
                              fill="#9ca3af" 
                              fontSize={12}
                              fontWeight={600}
                            >
                              {payload.value}
                            </text>
                          </g>
                        )}
                      </XAxis>
                      
                      {/* EJE Y: Días restantes */}
                      <YAxis 
                        dataKey="diasRestantes" 
                        name="Días Restantes" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        label={{ 
                          value: 'Días Restantes', 
                          angle: -90, 
                          position: 'insideLeft',
                          fill: '#94a3b8',
                          fontSize: 12,
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      
                      <ReferenceLine y={7} stroke="#FF4444" strokeDasharray="4 4" label={{ value: '7 días', fill: '#FF4444', fontSize: 10 }} />
                      
                      {/* Tooltip personalizado */}
                      <Tooltip
                        {...tooltipTheme}
                        cursor={{ strokeDasharray: '3 3', stroke: '#38bdf8', strokeOpacity: 0.5 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const project = payload[0].payload;
                            return (
                              <div className="proyecto-riesgo-tooltip">
                                <h4>{project.name}</h4>
                                <p><strong>Días restantes:</strong> {project.diasRestantes} días</p>
                                <p className={`riesgo-${project.riesgo}`}>
                                  <strong>Estado:</strong> {
                                    project.riesgo === 'critical' ? 'Crítico' :
                                    project.riesgo === 'warning' ? 'Alerta' : 'En ruta'
                                  }
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      
                      <Legend wrapperStyle={{ fontSize: 12, color: '#f0f9ff' }} />
                      <Scatter 
                        name="Proyectos" 
                        data={proyectosRiesgo.map((p, index) => ({ 
                          ...p, 
                          indice: index + 1 
                        }))} 
                        fill="transparent" 
                        shape="circle"
                      >
                        {proyectosRiesgo.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.riesgo === 'critical' ? '#FF4444' :
                              entry.riesgo === 'warning' ? '#FF8042' : '#00C49F'
                            }
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* ===== PANEL DE ALERTAS Y RECOMENDACIONES ===== */}
                <div className="alertas-panel">
                  <h4 className="alertas-titulo">Alertas y Recomendaciones</h4>
                  
                  {proyectosRiesgo.length === 0 ? (
                    <div className="alertas-vacio">Todos los proyectos están en orden. ✅</div>
                  ) : (
                    <div className="alertas-lista">
                      {/* Proyectos críticos o vencidos */}
                      {proyectosRiesgo
                        .filter(p => p.diasRestantes <= 7 || p.diasRestantes < 0)
                        .map((p, index) => (
                          <div key={index} className="alerta-item alerta-critical">
                            {p.diasRestantes < 0 ? (
                              <span className="alerta-texto">
                                <strong>🔴 Proyecto retrasado:</strong> {p.name} lleva <strong>{Math.abs(p.diasRestantes)} días</strong> de retraso.
                              </span>
                            ) : (
                              <span className="alerta-texto">
                                <strong>⚠️ Proyecto crítico:</strong> {p.name} solo tiene <strong>{p.diasRestantes} días</strong> restantes.
                              </span>
                            )}
                          </div>
                        ))}
                      
                      {/* Proyectos en alerta (entre 8 y 14 días) */}
                      {proyectosRiesgo
                        .filter(p => p.diasRestantes > 7 && p.diasRestantes <= 14)
                        .map((p, index) => (
                          <div key={index} className="alerta-item alerta-warning">
                            <span className="alerta-texto">
                              <strong>🟠 Proyecto en alerta:</strong> {p.name} tiene <strong>{p.diasRestantes} días</strong> restantes, se recomienda acelerar el progreso.
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="riesgo-legend">
                  <span><span className="dot critical"></span> Crítico</span>
                  <span><span className="dot warning"></span> Alerta</span>
                  <span><span className="dot safe"></span> En Ruta</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FILA 6: Top Clientes + Clientes por Empresa */}
        <div className="chart-row">
          <div className="chart-card">
            <h3>Top Clientes por Presupuesto</h3>
            <div className="chart-interpretation">
              <Info size={14} className="interpretacion-icon" />
              {INTERPRETACIONES.topClientes}
            </div>
            {topClientes.length === 0 ? (
              <div className="empty-chart">No hay clientes con presupuesto</div>
            ) : (
              <ResponsiveContainer width="100%" height={alturaDinamica(topClientes)}>
                <BarChart 
                  data={topClientes} 
                  layout="vertical" 
                  margin={{ left: 10, bottom: 40 }}
                  barCategoryGap="35%" 
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    type="number" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    label={{ 
                      value: 'Presupuesto ($)', 
                      position: 'bottom',
                      offset: 10,
                      fill: '#94a3b8',
                      fontSize: 12,
                      fontWeight: 500,
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130} 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <Tooltip {...tooltipTheme} formatter={(value) => `💰 $${value.toLocaleString()}`} labelFormatter={(v) => v} />
                  
                  {/* Barra con degradado AZUL (todas las barras) */}
                  <Bar dataKey="presupuesto" name="Presupuesto" radius={[4, 4, 0, 0]} barSize={22}>
                    <defs>
                      <linearGradient id="gradienteAzul" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0088FE" />
                      </linearGradient>
                    </defs>
                    {topClientes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#gradienteAzul)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          
          <div className="chart-card">
            <h3>Clientes y sus Proyectos</h3>
            <div className="chart-interpretation">
              <Info size={14} className="interpretacion-icon" />
              Lista de todos los clientes. Haz clic en una fila para ver los proyectos completos.
            </div>
            {clientesIndustria.length === 0 ? (
              <div className="empty-chart">No hay clientes registrados</div>
            ) : (
              <>
                {/* CONTADOR TOTAL */}
                <div className="tabla-total-clientes">
                  <strong>{clientesIndustria.length}</strong> clientes encontrados
                </div>

                <div className="tabla-clientes-scroll">
                  <table className="tabla-clientes">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Proyectos</th>
                       
                      </tr>
                    </thead>
                    <tbody>
                      {clientesIndustria.map((cliente, index) => (
                        <tr 
                          key={index} 
                          className={`tabla-fila ${openCliente === index ? 'expandida' : ''}`}
                          onClick={() => setOpenCliente(openCliente === index ? null : index)}
                        >
                          {/* Columna 1: Nombre */}
                          <td>
                            <span className="cliente-nombre">
                              <span className="cliente-icono">
                                {openCliente === index ? '▼' : '▶'}
                              </span>
                              {cliente.name}
                            </span>
                          </td>
                          
                        
                          {/* Columna 3: Proyectos (expandible) */}
                            <td className="celda-proyectos">
                              {openCliente === index ? (
                                <ul className="lista-proyectos">
                                  {cliente.proyectos && cliente.proyectos.length > 0 ? (
                                    cliente.proyectos.map((proyecto, i) => (
                                      <li key={i}>{proyecto}</li>
                                    ))
                                  ) : (
                                    <li className="placeholder-proyectos">Sin proyectos registrados</li>
                                  )}
                                </ul>
                              ) : (
                                <span className="resumen-proyectos">
                                  {(() => {
                                    if (cliente.proyectos && cliente.proyectos.length > 0) {
                                      const primerProyecto = cliente.proyectos[0];
                                      const numExtra = cliente.proyectos.length - 1;
                                      return `${primerProyecto}${numExtra > 0 ? ` +${numExtra} más` : ''}`;
                                    }
                                    return 'Sin proyectos';
                                  })()}
                                </span>
                              )}
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="dashboard-footer">
          <p>Analisis actualizado: {new Date().toLocaleString()}</p>
        </div>

      </div>
    </>
  );
}