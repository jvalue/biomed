import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';

/**
 * Format a cron expression into a human readable string.
 * Returns fallback messages for empty/invalid expressions.
 */
export function formatCronReadable(cronExpr?: string, locale = 'en'): string {
	console.log(cronExpr);
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
