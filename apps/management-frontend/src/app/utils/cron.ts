import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';

/**
 * Format a cron expression into a human readable string.
 * Returns fallback messages for empty/invalid expressions.
 */
export function formatCronReadable(cronExpr?: string, locale = 'en'): string {
	if (!cronExpr) return '-';
	// simple handling for @every token if used
	if (cronExpr.startsWith('@every')) {
		return cronExpr.replace('@every ', 'Every ');
	}

	try {
		// validate using the cron-parser new API
		CronExpressionParser.parse(cronExpr);
	} catch {
		return 'Invalid cron expression';
	}

	try {
		return cronstrue.toString(cronExpr, { locale });
	} catch {
		return 'Invalid cron expression';
	}
}

/**
 * Returns a local timezone hint string for a cron expression if it has a concrete UTC time,
 * e.g. "Europe/Berlin: 10:00 AM" or "Europe/Berlin: 10:00 AM, 06:00 PM" for list values.
 * Returns null for interval-based expressions (wildcards, steps) or invalid expressions.
 */
export function getCronLocalTimeHint(cronExpr?: string): string | null {
	if (!cronExpr || cronExpr.startsWith('@every')) return null;

	// Split into the 5 standard cron fields: minute hour dom month dow
	const parts = cronExpr.trim().split(/\s+/);
	if (parts.length !== 5) return null;

	const [minutePart, hourPart] = parts;

	// Only show a local time hint if both fields are concrete values (digits or comma-separated lists)
	const isFixedOrList = (part: string) => /^[\d,]+$/.test(part);
	if (!isFixedOrList(minutePart) || !isFixedOrList(hourPart)) return null;

	// Filter out invalid cron expressions
	try {
		CronExpressionParser.parse(cronExpr);
	} catch {
		return null;
	}

	const minutes = minutePart.split(',').map(Number);
	const hours = hourPart.split(',').map(Number);

	if (minutes.some((m) => m < 0 || m > 59) || hours.some((h) => h < 0 || h > 23)) return null;

	const now = new Date();
	const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Cartesian product of hours × minutes
	const localTimes = hours.flatMap((hour) =>
		minutes.map((minute) => {
			const utcDate = new Date(
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute),
			);
			return utcDate.toLocaleTimeString(undefined, {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true,
			});
		}),
	);

	return `${tzName}: ${localTimes.join(', ')}`;
}

/**
 * Return the next run date for a given cron expression or null if not resolvable.
 */
export function getNextRunDate(cronExpr?: string): Date | null {
	if (!cronExpr) return null;
	try {
		// use the parser to get an iterator
		const interval = CronExpressionParser.parse(cronExpr, { currentDate: new Date(), tz: 'UTC' });
		const next = interval.next();
		return next.toDate();
	} catch {
		return null;
	}
}
