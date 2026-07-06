import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeTasks from './pages/EmployeeTasks';      // <-- IMPORTAR
import EmployeeKanban from './pages/EmployeeKanban';    // <-- IMPORTAR
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