import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  CheckCircle, Clock, TrendingUp, AlertTriangle, Briefcase, 
  CheckSquare, XCircle, Loader2, Info, ArrowLeft, Search,
  CalendarClock, Rocket, AlertOctagon, Activity
} from 'lucide-react';
import './DashboardAnalisis.css';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RePieChart, Pie, Cell,
  ComposedChart, Line, ReferenceLine, Area,
  ResponsiveContainer
} from 'recharts';

const COLORS = {
  pie: ['#22C55E', '#3B82F6', '#F97316', '#EF4444'],
  riesgo: {
    critical: '#EF4444',
    warning: '#F97316',
    safe: '#22C55E'
  }
};

export default function AnalisisProyecto() {
  const { projectId } = useParams();
  const { user } = useAuth();

  // Estados
  const [projects, setProjects] = useState([]); // Lista de proyectos
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || null);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Cargar lista de proyectos al montar
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/analisis/proyectos/disponibles');
        setProjects(response.data);
      } catch (err) {
        console.error('Error al cargar proyectos:', err);
      }
    };
    fetchProjects();
  }, []);

  // Cargar análisis cuando se selecciona un proyecto
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchAnalisis = async () => {
      setLoading(true);
      setLoadingProgress(0);
      setError(null);

      const interval = setInterval(() => {
        setLoadingProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      try {
        const response = await api.get(`/analisis/proyecto/${selectedProjectId}`);
        setProject(response.data);
        setLoadingProgress(100);
      } catch (err) {
        setError('No se pudo cargar el análisis');
        setProject(null);
      } finally {
        clearInterval(interval);
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchAnalisis();
  }, [selectedProjectId]);

  // Función para seleccionar proyecto desde la URL (si llegó con un ID)
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  // Datos del proyecto
  const {
    name,
    status,
    progress,
    endDate,
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    approvedEvidences,
    rejectedEvidences,
    daysRemaining,
    riskLevel,
    tendencia,
    velocidad_diaria,
    velocidad_necesaria,
    grafica_tendencia,
    proyeccion
  } = project || {};

  // Función para mapear tendencia a texto e icono
  const getTendencia = () => {
    switch (tendencia) {
      case 'adelantado':
        return { texto: 'Terminará antes', color: '#22C55E', icono: <Rocket size={24} /> };
      case 'buen_camino':
        return { texto: 'Va por buen camino', color: '#00C49F', icono: <Activity size={24} /> };
      case 'riesgo_retraso':
        return { texto: 'Se puede retrasar', color: '#F97316', icono: <AlertOctagon size={24} /> };
      case 'retrasado':
        return { texto: 'Proyecto retrasado', color: '#EF4444', icono: <AlertTriangle size={24} /> };
      default:
        return { texto: 'Sin tendencia', color: '#94a3b8', icono: <Activity size={24} /> };
    }
  };

  const tendenciaInfo = getTendencia();
  const riskColor = COLORS.riesgo[riskLevel] || '#22C55E';

  // Datos para gráficas
  const taskData = [
    { name: 'Completadas', value: completedTasks || 0 },
    { name: 'En Progreso', value: inProgressTasks || 0 },
    { name: 'Pendientes', value: pendingTasks || 0 }
  ];

  const evidenceData = [
    { name: 'Aprobadas', value: approvedEvidences || 0 },
    { name: 'Rechazadas', value: rejectedEvidences || 0 }
  ];

  return (
    <>
      <Navbar />
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

      <div className="dashboard-analisis">
        {/* Botón para volver */}
        <button className="btn-refresh" style={{ marginBottom: '20px' }} onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Volver al Dashboard
        </button>

        {/* HEADER */}
        <div className="dashboard-header-glass">
          <div className="dashboard-header-content">
            <div className="dashboard-title">
              <div className="dashboard-title-icon">
                <Briefcase size={28} />
              </div>
              <div>
                <h1>Análisis por Proyecto</h1>
                <p>Selecciona un proyecto y visualiza su análisis detallado</p>
              </div>
            </div>
          </div>
        </div>

        {/* SELECTOR DE PROYECTOS */}
        <div className="chart-card full-width" style={{ marginTop: '20px' }}>
          <h3>Selecciona un proyecto</h3>
          <div className="chart-interpretation">
            <Search size={14} className="interpretacion-icon" />
            Elige el proyecto que deseas analizar.
          </div>
          
          <div className="select-proyecto-container">
            {projects.length === 0 ? (
              <div className="empty-chart">No hay proyectos disponibles</div>
            ) : (
              <select 
                className="select-proyecto"
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">-- Selecciona un proyecto --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* BARRA DE CARGA (Solo si está cargando, sin ocupar toda la pantalla) */}
        {loading && (
          <div className="chart-card" style={{ maxWidth: '500px', margin: '20px auto' }}>
            <div className="loading-container">
              <div className="loading-icon">
                <Briefcase size={40} />
              </div>
              <div className="loading-bar-wrapper">
                <div className="loading-bar-track">
                  <div className="loading-bar-fill" style={{ width: `${loadingProgress}%` }} />
                </div>
                <div className="loading-percentage">{loadingProgress}%</div>
              </div>
              <div className="loading-text">
                <Loader2 size={16} className="loading-spinner-icon" />
                <span>Cargando análisis...</span>
              </div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="empty-chart" style={{ marginTop: '20px' }}>{error}</div>
        )}

        {/* ANÁLISIS (Se muestra cuando hay proyecto y no está cargando) */}
        {!loading && project && (
          <>
            {/* HEADER DEL PROYECTO */}
            <div className="dashboard-header-glass" style={{ marginTop: '20px' }}>
              <div className="dashboard-header-content">
                <div className="dashboard-title">
                  <div className="dashboard-title-icon">
                    <Briefcase size={28} />
                  </div>
                  <div>
                    <h1>{name}</h1>
                    <p>Análisis detallado del proyecto</p>
                  </div>
                </div>
                <div className="dashboard-header-actions">
                  <span className="priority-badge" style={{ 
                    background: `${riskColor}20`, 
                    color: riskColor, 
                    border: `1px solid ${riskColor}40`,
                    fontSize: '12px',
                    padding: '6px 14px'
                  }}>
                    {status || 'Activo'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPIs SIMPLES */}
            <div className="kpi-grid">
              {/* KPI DE TENDENCIA (Reemplaza el de avance) */}
              <div className="kpi-card" style={{ borderColor: tendenciaInfo.color }}>
                <div className="kpi-icon" style={{ background: `${tendenciaInfo.color}15`, color: tendenciaInfo.color }}>
                  {tendenciaInfo.icono}
                </div>
                <div className="kpi-info">
                  <span className="kpi-value" style={{ fontSize: '14px', lineHeight: '1.2', color: tendenciaInfo.color }}>
                    {tendenciaInfo.texto}
                  </span>
                  <span className="kpi-label">Tendencia del proyecto</span>
                </div>
              </div>

              <div className="kpi-card" style={{ borderColor: '#3B82F6' }}>
                <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                  <Clock size={24} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value">{daysRemaining} días</span>
                  <span className="kpi-label">Días restantes</span>
                </div>
              </div>

              <div className="kpi-card" style={{ borderColor: '#A78BFA' }}>
                <div className="kpi-icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA' }}>
                  <CheckSquare size={24} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value">{totalTasks}</span>
                  <span className="kpi-label">Total de tareas</span>
                </div>
              </div>

              <div className="kpi-card" style={{ borderColor: '#F97316' }}>
                <div className="kpi-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#F97316' }}>
                  <CheckCircle size={24} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value">{approvedEvidences}</span>
                  <span className="kpi-label">Evidencias aprobadas</span>
                </div>
              </div>
            </div>

            {/* ALERTA DE RIESGO */}
            {riskLevel === 'critical' && (
              <div className="alerta-item alerta-critical" style={{ marginBottom: '20px', padding: '15px' }}>
                <AlertTriangle size={20} />
                <span><strong>Este proyecto está en riesgo crítico.</strong> Tienes pocos días restantes y el avance es bajo. ¡Actúa rápido!</span>
              </div>
            )}
            {riskLevel === 'warning' && (
              <div className="alerta-item alerta-warning" style={{ marginBottom: '20px', padding: '15px' }}>
                <AlertOctagon size={20} />
                <span><strong>Atención:</strong> El proyecto está en alerta. Acelera el progreso para evitar retrasos.</span>
              </div>
            )}

            {/* GRÁFICAS */}
            <div className="chart-row">
              {/* Pastel de tareas */}
              <div className="chart-card">
                <h3>Estado de las Tareas</h3>
                <div className="chart-interpretation">
                  <Info size={14} className="interpretacion-icon" />
                  Distribución de tareas del proyecto.
                </div>
                {taskData.length === 0 ? (
                  <div className="empty-chart">No hay tareas registradas</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RePieChart>
                      <Pie
                        data={taskData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {taskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Barras de evidencias */}
              <div className="chart-card">
                <h3>Evidencias del Proyecto</h3>
                <div className="chart-interpretation">
                  <Info size={14} className="interpretacion-icon" />
                  Evidencias aprobadas vs rechazadas.
                </div>
                {evidenceData.length === 0 ? (
                  <div className="empty-chart">No hay evidencias registradas</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={evidenceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Cantidad">
                        {evidenceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#22C55E' : '#EF4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* GRÁFICA DE TENDENCIA (Datos Reales) */}
            <div className="chart-card full-width" style={{ marginTop: '20px' }}>
              <h3>Tendencia de Desarrollo</h3>
              <div className="chart-interpretation">
                <Info size={14} className="interpretacion-icon" />
                El área verde es la meta ideal. El área azul es tu progreso actual. Si el azul está encima del verde, vas adelantado.
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={grafica_tendencia || []} margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  
                  <ReferenceLine y={100} stroke="#22C55E" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Meta (100%)', position: 'insideTopRight', fill: '#22C55E', fontSize: 12 }} />
                  
                  <XAxis 
                    type="number" 
                    dataKey="dia" 
                    domain={[1, 'dataMax']}
                    allowDecimals={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    label={{ value: 'Días Transcurridos', position: 'bottom', offset: 10, fill: '#94a3b8', fontSize: 12 }}
                  />
                  
                  <YAxis 
                    stroke="#9ca3af" 
                    domain={[0, 100]} 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    label={{ value: 'Progreso (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                  />
                  
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'Progreso Esperado') return [`${value}%`, 'Esperado (A tiempo)'];
                      if (name === 'Progreso Actual') return [`${value}%`, 'Actual (Lo que llevas)'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Día ${label}`}
                  />
                  
                  <Legend verticalAlign="top" align="right" height={36} wrapperStyle={{ paddingTop: 10, fontSize: 13 }} />
                  
                  <Area dataKey="progreso_ideal" name="Progreso Esperado" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} strokeWidth={2} />
                  <Area dataKey="progreso_real" name="Progreso Actual" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                  
                  <Line data={proyeccion || []} dataKey="progreso" name="Proyección" stroke="#FF8042" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <p style={{ marginTop: '10px', color: '#94a3b8', fontSize: '13px' }}>
                <Info size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                <strong>Interpretación:</strong> La <span style={{ color: '#22C55E' }}><strong>línea verde</strong></span> es la meta. Si tu <span style={{ color: '#3B82F6' }}><strong>línea azul</strong></span> está encima, vas adelantado. Si está debajo, te retrasas. La <span style={{ color: '#FF8042' }}><strong>línea naranja</strong></span> indica hacia dónde vas.
              </p>
            </div>

            {/* RESUMEN (Interpretación basada en datos) */}
            <div className="chart-card full-width" style={{ marginTop: '20px' }}>
              <h3>Resumen para todo el equipo</h3>
              <div className="chart-interpretation">
                <Info size={14} className="interpretacion-icon" />
                Entiende fácilmente cómo va tu proyecto.
              </div>
              <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#cbd5e1' }}>
                <p><Clock size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> <strong>Tiempo:</strong> Quedan <strong>{daysRemaining} días</strong> para la fecha límite.</p>
                <p><CheckSquare size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> <strong>Tareas:</strong> De <strong>{totalTasks} tareas</strong> en total, <strong>{completedTasks} están completadas</strong>, <strong>{inProgressTasks} en progreso</strong> y <strong>{pendingTasks} pendientes</strong>.</p>
                <p><CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> <strong>Evidencias:</strong> Tienes <strong>{approvedEvidences} aprobadas</strong> y <strong>{rejectedEvidences} rechazadas</strong>.</p>
                
                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p>
                    <Activity size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> 
                    <strong>Tendencia:</strong> {
                      tendencia === 'adelantado' ? 'El proyecto va a terminar antes de lo esperado. Excelente ritmo.' : 
                      tendencia === 'buen_camino' ? 'El proyecto va por buen camino, pero mantén el ritmo para no retrasarte.' : 
                      tendencia === 'riesgo_retraso' ? 'El proyecto se puede retrasar. Necesitas aumentar la velocidad o reducir alcance.' : 
                      'El proyecto ya está retrasado. ¡Actúa de inmediato!'
                    }
                  </p>
                  <p><TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> <strong>Progreso actual:</strong> Llevas <strong>{progress}%</strong> del proyecto.</p>
                  <p><Rocket size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> <strong>Velocidad necesaria:</strong> Necesitas avanzar <strong>{velocidad_necesaria}% por día</strong> para terminar a tiempo.</p>
                </div>
                
                {riskLevel === 'safe' && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '8px', color: '#22C55E' }}>
                    <Activity size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> <strong>¡Vas por buen camino!</strong> El proyecto está en orden.
                  </div>
                )}
                {riskLevel !== 'safe' && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#EF4444' }}>
                    <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> <strong>Recomendación:</strong> Prioriza las tareas pendientes y verifica las evidencias rechazadas para no retrasar la entrega.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}