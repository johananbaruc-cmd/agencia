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
import AdminCalendar from './pages/AdminCalendar'; // ✅ NUEVO: Calendario de admin
import ProjectsNew from './pages/ProjectsNew';
import ProjectDetail from './pages/ProjectDetail';
import Clients from './pages/Clients';
import Employees from './pages/Employees';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard - todos los usuarios autenticados */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
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
          
          {/* Redirección por defecto */}
          <Route path="/" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;