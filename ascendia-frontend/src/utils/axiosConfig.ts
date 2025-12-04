import axios from 'axios';

// Instancia de Axios con configuración base
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // enviar siempre la cookie de sesión (access_token)
});

export default axiosInstance;
