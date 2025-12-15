import axios from 'axios';

export const managementBackendClient = axios.create({
	baseURL: (window as any).MANAGEMENT_BACKEND_BASE_URL! || 'http://localhost:3002/api/v1',
	timeout: 10000,
});

// Request Interceptor: Attach Authorization Header with Bearer Token
managementBackendClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('accessToken');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

// Response Interceptor: Handlet 401 Unauthorized Responses
managementBackendClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem('accessToken');
			window.location.href = '/login';
		}
		return Promise.reject(error);
	},
);
