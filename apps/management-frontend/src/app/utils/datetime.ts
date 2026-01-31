/**
 * Format a Date for use in `<input type="datetime-local">`.
 *
 * Important: `datetime-local` has no timezone. This formats the Date in the
 * user's *local timezone* as `YYYY-MM-DDTHH:mm`.
 */ export function toDatetimeLocalValue(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		[date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-') +
		'T' +
		[pad(date.getHours()), pad(date.getMinutes())].join(':')
	);
}

/**
 * Parse a `<input type="datetime-local">` value into a Date.
 *
 * The value is interpreted as local time.
 */ export function fromDatetimeLocalValue(value: string): Date {
	return new Date(value);
}

/**
 * Safely parse an ISO date string (e.g. from URL query params).
 * Returns `undefined` for invalid values.
 */
export function parseIsoDate(value: unknown): Date | undefined {
	if (typeof value !== 'string') return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}
