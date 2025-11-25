import axios from 'axios';

export const managementBackendClient = axios.create({
	baseURL: import.meta.env.MANAGEMEN_BACKEND_BASE_URL || 'http://localhost:3002',
	timeout: 10000,
});
