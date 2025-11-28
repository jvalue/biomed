import axios from 'axios';

export const managementBackendClient = axios.create({
	baseURL: import.meta.env.MANAGEMENT_BACKEND_BASE_URL || 'http://localhost:3002/api/v1',
	timeout: 10000,
});
