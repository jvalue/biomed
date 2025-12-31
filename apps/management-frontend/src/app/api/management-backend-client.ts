import axios from 'axios';
import { toast } from 'react-toastify';

export const managementBackendClient = axios.create({
	// biome-ignore lint/suspicious/noExplicitAny: <needed here>
	baseURL: (window as any).MANAGEMENT_BACKEND_BASE_URL || 'http://localhost:3002/api/v1',
	timeout: 10000,
	withCredentials: true,
});

managementBackendClient.interceptors.response.use(
	(response) => response,
	(error) => {
		const msg =
			error?.response?.data?.message ??
			error?.response?.data ??
			error?.message ??
			'Network or server error';
		if (error?.response?.status === 401) {
			// Ignore unauthorized errors, they are handled by redirecting to login
			return;
		}
		toast.error(`Request failed: ${msg}`, { autoClose: 8000 });
		return Promise.reject(error);
	},
);
