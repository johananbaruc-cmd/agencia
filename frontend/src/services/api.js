import axios from 'axios';

// ✅ API_URL para las peticiones al backend (con /api/v1)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ✅ STATIC_URL para archivos estáticos (SIN /api/v1)
const STATIC_URL = import.meta.env.VITE_STATIC_URL || 'http://localhost:8000';

console.log('🔗 API URL configurada:', API_URL);
console.log('📁 STATIC URL configurada:', STATIC_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  console.log('Request:', config.method, config.url);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ✅ Exportar STATIC_URL para usarlo en otros componentes
export { STATIC_URL };
export default api;