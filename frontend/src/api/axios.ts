import axios from "axios";

// Create axios instance with base URL set to '/api' for Nginx proxy
const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token automatically to every request if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Ensure headers object exists
      config.headers = config.headers || {};
      (config.headers as any)["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally to clear invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default api;
export const API_BASE_URL = api.defaults.baseURL as string;
console.debug("[axios] baseURL:", API_BASE_URL);
