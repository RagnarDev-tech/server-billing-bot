import axios from 'axios';

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Додаємо інтерцептор, щоб автоматично слати токен
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default instance;