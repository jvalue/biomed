import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';

/**
 * Format a cron expression into a human readable string (interpreted in the schedule timezone).
 * Returns fallback messages for empty/invalid expressions.
 */
export function formatCronReadable(cronExpr?: string, scheduleTz?: string, locale = 'en'): string {
	if (!cronExpr) return '-';
	if (cronExpr.startsWith('@every')) return cronExpr.replace('@every ', 'Every ');

	try {
		CronExpressionParser.parse(cronExpr);
	} catch {
		return 'Invalid cron expression';
	}

	try {
		const pattern = cronstrue.toString(cronExpr, { locale });
		const tzLabel = scheduleTz ? ` (${scheduleTz})` : '';
		return `${pattern}${tzLabel}`;
		// → "At 09:00 AM (America/New_York)"
	} catch {
		return 'Invalid cron expression';
	}
}

/**
 * Return the next run date (UTC) for a given cron expression or null if not resolvable.
 * Use toLocaleString() to display in the user's timezone.
 */
export function getNextRunDate(cronExpr?: string, scheduleTimezone?: string): Date | null {
	if (!cronExpr) return null;

	try {
		const interval = CronExpressionParser.parse(cronExpr, {
			currentDate: new Date(),
			tz: scheduleTimezone ?? 'UTC',
		});
		return interval.next().toDate();
	} catch {
		return null;
	}
}
