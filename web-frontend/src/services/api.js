import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.API_URL,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('web_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
