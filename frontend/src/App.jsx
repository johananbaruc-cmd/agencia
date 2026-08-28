import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeTasks from './pages/EmployeeTasks';
import EmployeeKanban from './pages/EmployeeKanban';
import EmployeeEvidence from './pages/EmployeeEvidence';
import EmployeeCalendar from './pages/EmployeeCalendar';
import AdminEvidence from './pages/AdminEvidence';
import AdminCalendar from './pages/AdminCalendar';
import ProjectsNew from './pages/ProjectsNew';
import ProjectDetail from './pages/ProjectDetail';
import Clients from './pages/Clients';
import Employees from './pages/Employees';

// ==========================================
// REPORTES - Páginas de Admin
// ==========================================
import ReportesProyectos from './pages/ReportesProyectos';
import CrearReporte from './pages/CrearReporte';
import DetalleReporte from './pages/DetalleReporte';
import ReportesGestion from './pages/ReportesGestion';

// ==========================================
// REPORTES - Páginas Públicas
// ==========================================
import AccesoReporte from './pages/public/AccesoReporte';
import VerReporte from './pages/public/VerReporte';

// ==========================================
// DASHBOARD DE ANÁLISIS - ADMIN 👈 NUEVA IMPORTACIÓN
// ==========================================
import DashboardAnalisis from './pages/DashboardAnalisis';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ========================================== */}
          {/* RUTAS PÚBLICAS */}
          {/* ========================================== */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas públicas de reportes (sin autenticación) */}
          <Route path="/acceso/reporte/:token" element={<AccesoReporte />} />
          <Route path="/reporte/:token" element={<VerReporte />} />
          
          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - ADMIN */}
          {/* ========================================== */}
          
          {/* Dashboard - todos los usuarios autenticados */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Detalle de proyecto - todos los usuarios autenticados */}
          <Route path="/projects/:id" element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          } />
          
          {/* Crear proyecto - solo admin */}
          <Route path="/projects/new" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProjectsNew />
            </ProtectedRoute>
          } />
          
          {/* Clientes - solo admin */}
          <Route path="/clients" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Clients />
            </ProtectedRoute>
          } />
          
          {/* Empleados - solo admin */}
          <Route path="/employees" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Employees />
            </ProtectedRoute>
          } />

          {/* Admin Evidence - solo admin (gestionar evidencias) */}
          <Route path="/admin-evidence" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminEvidence />
            </ProtectedRoute>
          } />

          {/* Admin Calendar - solo admin (calendario de tareas por empleado/proyecto) */}
          <Route path="/admin-calendar" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCalendar />
            </ProtectedRoute>
          } />

          {/* ========================================== */}
          {/* REPORTES - ADMIN */}
          {/* ========================================== */}
          <Route path="/reportes/proyectos" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReportesProyectos />
            </ProtectedRoute>
          } />

          <Route path="/reportes/crear/:projectId?" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CrearReporte />
            </ProtectedRoute>
          } />

          <Route path="/reportes/detalle/:reporteId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DetalleReporte />
            </ProtectedRoute>
          } />

          <Route path="/reportes/gestion" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReportesGestion />
            </ProtectedRoute>
          } />

          {/* ========================================== */}
          {/* DASHBOARD DE ANÁLISIS - ADMIN 👈 NUEVA RUTA */}
          {/* ========================================== */}
          <Route path="/dashboard-analisis" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardAnalisis />
            </ProtectedRoute>
          } />

          {/* ========================================== */}
          {/* RUTAS PROTEGIDAS - EMPLOYEE */}
          {/* ========================================== */}
          
          {/* Employee Dashboard - solo empleados */}
          <Route path="/employee-dashboard" element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />

          {/* Employee Tasks - solo empleados */}
          <Route path="/employee-tasks" element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeeTasks />
            </ProtectedRoute>
          } />

          {/* Employee Kanban - solo empleados */}
          <Route path="/employee-kanban" element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeeKanban />
            </ProtectedRoute>
          } />

          {/* Employee Evidence - solo empleados (ver sus propias evidencias) */}
          <Route path="/employee-evidence" element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeeEvidence />
            </ProtectedRoute>
          } />

          {/* Employee Calendar - solo empleados (calendario de tareas) */}
          <Route path="/employee-calendar" element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeeCalendar />
            </ProtectedRoute>
          } />
          
          {/* ========================================== */}
          {/* REDIRECCIÓN POR DEFECTO */}
          {/* ========================================== */}
          <Route path="/" element={<Login />} />
          
          {/* Ruta 404 - Opcional */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300">404</h1>
                <p className="text-gray-600 mt-2">Página no encontrada</p>
                <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
                  Volver al inicio
                </a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;