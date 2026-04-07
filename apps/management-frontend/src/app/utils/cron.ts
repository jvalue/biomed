import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';

/**
 * Format a cron expression into a human readable string and optionally append the schedule timezone label.
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
 * Return the next run date for a given cron expression, or null if not resolvable.
 * The cron schedule is evaluated in the provided scheduleTimezone (or UTC if omitted),
 * and the returned Date represents an absolute instant that can be formatted in any timezone
 * (e.g. using toLocaleString() for the user's local time).
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

/**
 * Return a short hint explaining that the displayed next-run time is local.
 * Returns `null` for empty/invalid cron expressions so callers can suppress the hint.
 */
export function getCronLocalTimeHint(cronExpr?: string, scheduleTimezone?: string): string | null {
	if (!cronExpr) return null;

	try {
		// Validate the expression by attempting to parse it. We don't need the result here,
		// just ensure it's a resolvable cron expression.
		CronExpressionParser.parse(cronExpr, {
			currentDate: new Date(),
			tz: scheduleTimezone ?? 'UTC',
		});
	} catch {
		return null;
	}

	if (scheduleTimezone) {
		return `Times shown are converted from ${scheduleTimezone} to your local time.`;
	}

	return 'Times shown are in your local timezone.';
}
