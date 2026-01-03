// Utility to format a duration given in seconds into a concise, English human-readable string.
// Examples:
//  - 0 -> "0s"
//  - 45 -> "45s"
//  - 90 -> "1m 30s"
//  - 3600 -> "1h"
//  - 90061 -> "1d 1h 1m 1s"

export function formatDurationSeconds(totalSeconds?: number | null): string {
	if (totalSeconds === undefined || totalSeconds === null) return '-';

	const s = Number(totalSeconds);
	if (Number.isNaN(s)) return '-';
	if (s === 0) return '0s';

	let remaining = s;
	const days = Math.floor(remaining / 86400);
	remaining -= days * 86400;
	const hours = Math.floor(remaining / 3600);
	remaining -= hours * 3600;
	const minutes = Math.floor(remaining / 60);
	remaining -= minutes * 60;
	const seconds = remaining;

	const parts: string[] = [];
	if (days) parts.push(`${days}d`);
	if (hours) parts.push(`${hours}h`);
	if (minutes) parts.push(`${minutes}m`);
	if (seconds) {
		// If seconds is an integer show without decimals, otherwise show one decimal place
		const secStr = Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
		parts.push(secStr);
	}

	// Return the compact representation. If it's empty for some reason, fall back to seconds.
	return parts.length > 0 ? parts.join(' ') : `${s}s`;
}
