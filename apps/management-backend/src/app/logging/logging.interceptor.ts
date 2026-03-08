import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { sanitizePayload } from './sanitize.util';

/**
 * Global interceptor that logs every incoming HTTP request and its response.
 *
 * Log-Level LOG:
 * - HTTP method, route, sanitized request body, user ID, response status code, duration in ms
 *
 * Sensitive data (passwords, tokens, etc.) is automatically masked via sanitizePayload().
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger('HTTP');

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== 'http') {
			return next.handle();
		}

		const request = context.switchToHttp().getRequest();
		const { method, url, body } = request;

		// Extract user ID from JWT-authenticated request (Passport sets request.user)
		const userId: string = request.user?.id ?? request.user?.username ?? 'anonymous';

		const sanitizedBody = body && Object.keys(body).length > 0 ? sanitizePayload(body) : undefined;

		const startTime = Date.now();

		return next.handle().pipe(
			tap({
				next: () => {
					const response = context.switchToHttp().getResponse();
					const statusCode: number = response.statusCode;
					const duration = Date.now() - startTime;

					this.logger.log(
						`${method} ${url} | User: ${userId} | Status: ${statusCode} | ${duration}ms` +
							(sanitizedBody ? ` | Body: ${JSON.stringify(sanitizedBody)}` : ''),
					);
				},
				error: () => {
					const duration = Date.now() - startTime;
					this.logger.log(
						`${method} ${url} | User: ${userId} | FAILED | ${duration}ms` +
							(sanitizedBody ? ` | Body: ${JSON.stringify(sanitizedBody)}` : ''),
					);
				},
			}),
		);
	}
}
