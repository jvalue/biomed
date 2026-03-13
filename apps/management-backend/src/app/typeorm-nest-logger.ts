import { Logger } from '@nestjs/common';
import type { QueryRunner, Logger as TypeOrmLoggerInterface } from 'typeorm';
import { sanitizePayload } from './logging';

/**
 * Detects positional parameter placeholders ($1, $2, …) that are associated
 * with sensitive column names in a SQL query and replaces their values with a mask
 *
 * TypeORM passes parameters as a positional array, so we derive which index
 * maps to a sensitive column by scanning the query for patterns like
 * `"passwordHash" = $3` or `("col1", "passwordHash") VALUES ($1, $2)`.
 *
 * For INSERT statements the column list and the VALUES placeholder list are
 * aligned by position, so we match them up accordingly.
 */
function sanitizeQueryParameters(query: string, parameters: unknown[]): unknown[] {
	const sensitiveIndices = new Set<number>();

	// Pattern 1 – UPDATE SET / WHERE: "columnName" = $n
	const assignmentPattern = /["']?(\w+)["']?\s*=\s*\$(\d+)/gi;
	for (const match of query.matchAll(assignmentPattern)) {
		const colName = match[1];
		const paramIndex = Number(match[2]) - 1;
		// Re-use the same SENSITIVE_KEYS logic via a single-property object
		const sanitized = sanitizePayload({ [colName]: 'probe' }) as Record<string, unknown>;
		if (sanitized[colName] === '***') {
			sensitiveIndices.add(paramIndex);
		}
	}

	// Pattern 2 – INSERT: ("col1", "col2", …) VALUES ($1, $2, …)
	const insertPattern = /\(([^)]+)\)\s+VALUES\s+\(([^)]+)\)/gi;
	for (const match of query.matchAll(insertPattern)) {
		const columnsPart = match[1];
		const valuesPart = match[2];

		const columns = columnsPart.split(',').map((c) => c.trim().replace(/["']/g, ''));
		const placeholders = valuesPart.split(',').map((p) => p.trim());

		columns.forEach((col, colIdx) => {
			const placeholder = placeholders[colIdx];
			if (!placeholder) return;
			const paramMatch = /^\$(\d+)$/.exec(placeholder);
			if (!paramMatch) return;
			const paramIndex = Number(paramMatch[1]) - 1;
			const sanitized = sanitizePayload({ [col]: 'probe' }) as Record<string, unknown>;
			if (sanitized[col] === '***') {
				sensitiveIndices.add(paramIndex);
			}
		});
	}

	if (sensitiveIndices.size === 0) {
		return parameters;
	}

	return parameters.map((value, index) => (sensitiveIndices.has(index) ? '***' : value));
}

function formatParams(query: string, parameters?: unknown[]): string {
	if (!parameters?.length) return '';
	const sanitized = sanitizeQueryParameters(query, parameters);
	return ` -- Parameters: ${JSON.stringify(sanitized)}`;
}

/**
 * Custom TypeORM logger that integrates with NestJS's logging system.
 */
export class TypeOrmNestLogger implements TypeOrmLoggerInterface {
	private readonly logger = new Logger('TypeORM');

	logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
		this.logger.debug(`Query: ${query}${formatParams(query, parameters)}`);
	}

	logQueryError(
		error: string | Error,
		query: string,
		parameters?: unknown[],
		_queryRunner?: QueryRunner,
	) {
		this.logger.error(`Query Error: ${error} -- Query: ${query}${formatParams(query, parameters)}`);
	}

	logQuerySlow(time: number, query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
		this.logger.warn(`Slow Query: ${time}ms -- Query: ${query}${formatParams(query, parameters)}`);
	}

	logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
		this.logger.debug(`Schema Build: ${message}`);
	}

	logMigration(message: string, _queryRunner?: QueryRunner) {
		this.logger.log(`Migration: ${message}`);
	}

	log(level: 'log' | 'info' | 'warn', message: unknown, _queryRunner?: QueryRunner) {
		switch (level) {
			case 'log':
				this.logger.log(message);
				break;
			case 'info':
				this.logger.debug(message);
				break;
			case 'warn':
				this.logger.warn(message);
				break;
		}
	}
}
