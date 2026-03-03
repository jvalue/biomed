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
 * Returns the local-time equivalent string if the cron has a fixed UTC time,
 * otherwise returns null (e.g. for "every N minutes" style expressions).
 */
export function getCronLocalTimeHint(cronExpr?: string): string | null {
	if (!cronExpr || cronExpr.startsWith('@every')) return null;

	try {
		CronExpressionParser.parse(cronExpr);
	} catch {
		return null;
	}

	const parts = cronExpr.trim().split(/\s+/);
	// Standard 5-part cron: min hour dom month dow
	if (parts.length !== 5) return null;

	const [minutePart, hourPart] = parts;

	// Only convert if both minute and hour are fixed integers (no wildcards/ranges/steps/lists)
	const isFixed = (part: string) => /^\d+$/.test(part);
	if (!isFixed(minutePart) || !isFixed(hourPart)) return null;

	const minute = parseInt(minutePart, 10);
	const hour = parseInt(hourPart, 10);

	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

	// Build a UTC date with that time and convert to local
	const now = new Date();
	const utcDate = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute),
	);

	const localTimeStr = utcDate.toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});

	const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

	return `${tzName}: ${localTimeStr}`;
}

/**
 * Return the next run date for a given cron expression or null if not resolvable.
 */
export function getNextRunDate(cronExpr?: string): Date | null {
	if (!cronExpr) return null;
	try {
		// use the parser to get an iterator; cast options to any to avoid strict typing issues
		const interval = CronExpressionParser.parse(cronExpr, { currentDate: new Date() });
		const next = interval.next();
		return next.toDate();
	} catch {
		return null;
	}
}
