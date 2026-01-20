import { AxiosError } from 'axios';

/**
 * Determines if an error occured and if it is retryable.
 * @param error
 */
export function isRetryableError(error: Error): boolean {
	// If error is a client error (4xx), do not retry
	if (
		error instanceof AxiosError &&
		error.response?.status &&
		error.response?.status >= 400 &&
		error.response?.status < 500
	) {
		return false;
	}
	// If other error, retry
	return true;
}
