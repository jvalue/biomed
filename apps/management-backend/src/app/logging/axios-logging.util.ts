import { Logger } from '@nestjs/common';
import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { sanitizePayload } from './sanitize.util';

/**
 * Attaches request and response interceptors to an Axios instance for centralized logging
 * of all outgoing HTTP requests to external systems.
 *
 * Log-Level LOG:
 * - Outgoing request: method, URL, sanitized payload
 * - Response: status code, duration
 *
 * Log-Level ERROR:
 * - Failed requests: status code (if available), error message, duration
 */
export function attachAxiosLogging(axiosInstance: AxiosInstance, logger: Logger): void {
	// Request interceptor – log every outgoing request
	axiosInstance.interceptors.request.use(
		(config: InternalAxiosRequestConfig) => {
			// Store start time for duration measurement
			// biome-ignore lint/suspicious/noExplicitAny: we need this to store custom data on the config object
			(config as any).__startTime = Date.now();

			const method = (config.method ?? 'GET').toUpperCase();
			const url = buildFullUrl(config);
			const sanitizedData = config.data ? sanitizePayload(config.data) : undefined;

			logger.log(
				`Outgoing → ${method} ${url}` +
					(sanitizedData ? ` | Payload: ${JSON.stringify(sanitizedData)}` : ''),
			);

			return config;
		},
		(error) => {
			logger.error(`Outgoing request setup failed: ${error.message}`);
			return Promise.reject(error);
		},
	);

	// Response interceptor – log every response
	axiosInstance.interceptors.response.use(
		(response) => {
			const duration = getDuration(response.config);
			const method = (response.config.method ?? 'GET').toUpperCase();
			const url = buildFullUrl(response.config);

			logger.log(`Response ← ${method} ${url} | Status: ${response.status} | ${duration}ms`);

			return response;
		},
		(error) => {
			const config = error.config;
			const duration = config ? getDuration(config) : '?';
			const method = config ? (config.method ?? 'GET').toUpperCase() : 'UNKNOWN';
			const url = config ? buildFullUrl(config) : 'unknown';
			const status = error.response?.status ?? 'no response';

			logger.error(
				`Response ← ${method} ${url} | Status: ${status} | ${duration}ms | Error: ${error.message}`,
			);

			return Promise.reject(error);
		},
	);
}

function buildFullUrl(config: InternalAxiosRequestConfig): string {
	const base = config.baseURL ?? '';
	const path = config.url ?? '';
	// Avoid double slashes
	if (base && path.startsWith('/')) {
		return `${base}${path}`;
	}
	return `${base}/${path}`;
}

function getDuration(config: InternalAxiosRequestConfig): number {
	// biome-ignore lint/suspicious/noExplicitAny: we need this to read custom data on the config object
	const start = (config as any).__startTime;
	return start ? Date.now() - start : -1;
}
