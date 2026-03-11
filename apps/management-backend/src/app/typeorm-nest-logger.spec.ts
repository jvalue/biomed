import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TypeOrmNestLogger } from './typeorm-nest-logger';

// Restore all prototype spies after each test
beforeEach(() => {
	vi.restoreAllMocks();
});

function makeLogger() {
	const spies = {
		debug: vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined),
		log: vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined),
		warn: vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined),
		error: vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
	};
	const logger = new TypeOrmNestLogger();
	return { logger, inner: spies };
}

describe('sanitizeQueryParameters (via logQuery)', () => {
	describe('UPDATE / SET pattern – "column" = $n', () => {
		it('masks passwordHash parameter in UPDATE SET', () => {
			const { logger, inner } = makeLogger();
			const query = `UPDATE "users"
                           SET "passwordHash" = $1,
                               "username"     = $2
                           WHERE "id" = $3`;
			logger.logQuery(query, ['$2b$10$hashedvalue', 'alice', 'uuid-1']);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).toContain('"***"'); // passwordHash masked
			expect(logged).toContain('"alice"'); // username kept
			expect(logged).toContain('"uuid-1"'); // id kept
		});

		it('masks password parameter in WHERE clause', () => {
			const { logger, inner } = makeLogger();
			const query = `SELECT *
                           FROM "users"
                           WHERE "password" = $1`;
			logger.logQuery(query, ['plain-pw']);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).toContain('"***"');
		});

		it('masks hash (API key hash) in UPDATE', () => {
			const { logger, inner } = makeLogger();
			const query = `UPDATE "api_keys"
                           SET "hash"   = $1,
                               "prefix" = $2
                           WHERE "id" = $3`;
			logger.logQuery(query, ['sha256hashvalue', 'abc123', 'key-uuid']);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).toContain('"***"'); // hash masked
			expect(logged).toContain('"abc123"'); // prefix kept
		});

		it('does not mask non-sensitive columns', () => {
			const { logger, inner } = makeLogger();
			const query = `UPDATE "users"
                           SET "username" = $1,
                               "status"   = $2
                           WHERE "id" = $3`;
			logger.logQuery(query, ['bob', 'active', 'uuid-2']);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).toContain('"bob"');
			expect(logged).toContain('"active"');
			expect(logged).toContain('"uuid-2"');
			expect(logged).not.toContain('"***"');
		});
	});

	describe('INSERT pattern – (col1, col2) VALUES ($1, $2)', () => {
		it('masks passwordHash in INSERT', () => {
			const { logger, inner } = makeLogger();
			const query =
				`INSERT INTO "users" ("username", "passwordHash", "status") ` + `VALUES ($1, $2, $3)`;
			logger.logQuery(query, ['charlie', '$2b$10$insertedhash', 'pending']);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).toContain('"charlie"');
			expect(logged).toContain('"***"'); // passwordHash at $2 masked
			expect(logged).toContain('"pending"');
		});

		it('masks hash in INSERT for api_keys', () => {
			const { logger, inner } = makeLogger();
			const query =
				`INSERT INTO "api_keys" ("prefix", "hash", "description") ` + `VALUES ($1, $2, $3)`;
			logger.logQuery(query, ['abc123456789012', 'sha256value', 'my-key']);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).toContain('"abc123456789012"');
			expect(logged).toContain('"***"'); // hash at $2 masked
			expect(logged).toContain('"my-key"');
		});

		it('does not mask non-sensitive INSERT columns', () => {
			const { logger, inner } = makeLogger();
			const query = `INSERT INTO "schedules" ("name", "cronExpression")
                           VALUES ($1, $2)`;
			logger.logQuery(query, ['nightly', '0 2 * * *']);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).toContain('"nightly"');
			expect(logged).toContain('"0 2 * * *"');
			expect(logged).not.toContain('"***"');
		});
	});

	describe('edge cases', () => {
		it('returns original parameters array unchanged when no parameters given', () => {
			const { logger, inner } = makeLogger();
			const query = `SELECT *
                           FROM "users"`;
			logger.logQuery(query, []);

			const logged: string = inner.debug.mock.calls[0][0];
			// No Parameters suffix when array is empty
			expect(logged).not.toContain('Parameters');
		});

		it('returns original parameters when parameters is undefined', () => {
			const { logger, inner } = makeLogger();
			const query = `SELECT *
                           FROM "users"`;
			logger.logQuery(query, undefined);

			const logged: string = inner.debug.mock.calls[0][0];
			expect(logged).not.toContain('Parameters');
		});

		it('handles multiple sensitive columns in one query', () => {
			const { logger, inner } = makeLogger();
			const query =
				`INSERT INTO "users" ("username", "passwordHash", "token", "status") ` +
				`VALUES ($1, $2, $3, $4)`;
			logger.logQuery(query, ['dave', 'hash123', 'tok123', 'active']);

			const logged: string = inner.debug.mock.calls[0][0];
			const parsed: unknown[] = JSON.parse(logged.match(/Parameters: (\[.*])/)?.[1]);
			expect(parsed[0]).toBe('dave'); // username – safe
			expect(parsed[1]).toBe('***'); // passwordHash – masked
			expect(parsed[2]).toBe('***'); // token – masked
			expect(parsed[3]).toBe('active'); // status – safe
		});
	});
});

describe('TypeOrmNestLogger log methods', () => {
	it('logQuery calls logger.debug with query string', () => {
		const { logger, inner } = makeLogger();
		logger.logQuery('SELECT 1');
		expect(inner.debug).toHaveBeenCalledOnce();
		expect(inner.debug.mock.calls[0][0]).toContain('SELECT 1');
	});

	it('logQuery appends sanitized parameters', () => {
		const { logger, inner } = makeLogger();
		logger.logQuery('SELECT $1', ['safe-value']);
		const logged: string = inner.debug.mock.calls[0][0];
		expect(logged).toContain('safe-value');
	});

	it('logQueryError calls logger.error and includes error message', () => {
		const { logger, inner } = makeLogger();
		logger.logQueryError('syntax error', 'BAD SQL');
		expect(inner.error).toHaveBeenCalledOnce();
		const logged: string = inner.error.mock.calls[0][0];
		expect(logged).toContain('syntax error');
		expect(logged).toContain('BAD SQL');
	});

	it('logQueryError masks sensitive parameters', () => {
		const { logger, inner } = makeLogger();
		const query = `UPDATE "users"
                       SET "passwordHash" = $1
                       WHERE "id" = $2`;
		logger.logQueryError('err', query, ['secret-hash', 'uuid-x']);
		const logged: string = inner.error.mock.calls[0][0];
		expect(logged).toContain('"***"');
		expect(logged).toContain('"uuid-x"');
	});

	it('logQuerySlow calls logger.warn and includes elapsed time', () => {
		const { logger, inner } = makeLogger();
		logger.logQuerySlow(1234, 'SELECT slow');
		expect(inner.warn).toHaveBeenCalledOnce();
		const logged: string = inner.warn.mock.calls[0][0];
		expect(logged).toContain('1234');
		expect(logged).toContain('SELECT slow');
	});

	it('logQuerySlow masks sensitive parameters', () => {
		const { logger, inner } = makeLogger();
		const query = `UPDATE "users"
                       SET "passwordHash" = $1
                       WHERE "id" = $2`;
		logger.logQuerySlow(500, query, ['slow-hash', 'uuid-y']);
		const logged: string = inner.warn.mock.calls[0][0];
		expect(logged).toContain('"***"');
		expect(logged).toContain('"uuid-y"');
	});

	it('logSchemaBuild calls logger.debug', () => {
		const { logger, inner } = makeLogger();
		logger.logSchemaBuild('Creating table users');
		expect(inner.debug).toHaveBeenCalledOnce();
		expect(inner.debug.mock.calls[0][0]).toContain('Creating table users');
	});

	it('logMigration calls logger.log', () => {
		const { logger, inner } = makeLogger();
		logger.logMigration('Running migration 1234');
		expect(inner.log).toHaveBeenCalledOnce();
		expect(inner.log.mock.calls[0][0]).toContain('Running migration 1234');
	});

	it('log("log", ...) routes to logger.log', () => {
		const { logger, inner } = makeLogger();
		logger.log('log', 'some message');
		expect(inner.log).toHaveBeenCalledWith('some message');
	});

	it('log("info", ...) routes to logger.debug', () => {
		const { logger, inner } = makeLogger();
		logger.log('info', 'info message');
		expect(inner.debug).toHaveBeenCalledWith('info message');
	});

	it('log("warn", ...) routes to logger.warn', () => {
		const { logger, inner } = makeLogger();
		logger.log('warn', 'warn message');
		expect(inner.warn).toHaveBeenCalledWith('warn message');
	});
});
