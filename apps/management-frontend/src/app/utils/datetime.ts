/**
 * Safely parse an ISO date string (e.g. from URL query params).
 * Returns `undefined` for invalid values.
 */
export function parseIsoDate(value: unknown): Date | undefined {
	if (typeof value !== 'string') return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}
