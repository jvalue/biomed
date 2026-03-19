/**
 * Utility to sanitize sensitive data from objects before logging.
 * Ensures that passwords, tokens, API keys, and other secrets are never written to logs.
 */

const SENSITIVE_KEYS = new Set([
	'password',
	'passwordhash',
	'hash',
	'token',
	'accesstoken',
	'refreshtoken',
	'apikey',
	'api_key',
	'secret',
	'authorization',
	'cookie',
	'jwt',
	'credentials',
]);

const MASK = '***';

/**
 * Recursively sanitizes an object by masking values of sensitive keys.
 * Returns a new object – the original is never mutated.
 *
 * @param obj The object to sanitize
 * @param maxDepth Maximum recursion depth to prevent stack overflows (default: 5)
 */
export function sanitizePayload(obj: unknown, maxDepth = 5): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (maxDepth <= 0) {
		return '[max depth reached]';
	}

	if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => sanitizePayload(item, maxDepth - 1));
	}

	if (typeof obj === 'object') {
		const sanitized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			if (SENSITIVE_KEYS.has(key.toLowerCase())) {
				sanitized[key] = MASK;
			} else {
				sanitized[key] = sanitizePayload(value, maxDepth - 1);
			}
		}
		return sanitized;
	}

	return obj;
}
