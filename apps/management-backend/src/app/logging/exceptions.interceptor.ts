import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter that provides centralized error logging.
 *
 * - 4xx errors -> logged at WARN level
 * - 5xx errors / unhandled exceptions -> logged at ERROR level with stack trace
 *
 * Includes contextual information (URL, method, user) to aid debugging.
 */
@Catch()
export class ExceptionsInterceptor implements ExceptionFilter {
	private readonly logger = new Logger('ExceptionFilter');

	catch(exception: unknown, host: ArgumentsHost): void {
		if (host.getType() !== 'http') {
			return;
		}

		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const response = ctx.getResponse<Response>();

		const { method, url } = request;

		// Get user info from request
		const authenticatedRequest = request as Request & { user?: { id?: string; username?: string } };
		const userId: string =
			authenticatedRequest.user?.id ?? authenticatedRequest.user?.username ?? 'anonymous';

		let status: number;
		let message: string | object;

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			message = exception.getResponse();
		} else {
			status = HttpStatus.INTERNAL_SERVER_ERROR;
			message = 'Internal server error';
		}

		const errorMessage = typeof message === 'object' ? JSON.stringify(message) : message;

		const context = `${method} ${url} | User: ${userId}`;

		if (status >= 500) {
			// ERROR: Failures preventing request completion
			this.logger.error(
				`${context} | Status: ${status} | ${errorMessage}`,
				exception instanceof Error ? exception.stack : undefined,
			);
		} else if (status >= 400) {
			// WARN: Client errors - anomalies that don't represent system failures
			this.logger.warn(`${context} | Status: ${status} | ${errorMessage}`);
		}

		// Send the error response
		const responseBody =
			typeof message === 'object'
				? message
				: {
						statusCode: status,
						message,
						timestamp: new Date().toISOString(),
						path: url,
					};

		response.status(status).json(responseBody);
	}
}
