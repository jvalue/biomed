import { describe, expect, it } from 'vitest';
import { sanitizePayload } from './sanitize.util';

describe('sanitizePayload', () => {
	describe('primitives and nullish values', () => {
		it('returns null unchanged', () => {
			expect(sanitizePayload(null)).toBeNull();
		});

		it('returns undefined unchanged', () => {
			expect(sanitizePayload(undefined)).toBeUndefined();
		});

		it('returns a string unchanged', () => {
			expect(sanitizePayload('hello')).toBe('hello');
		});

		it('returns a number unchanged', () => {
			expect(sanitizePayload(42)).toBe(42);
		});

		it('returns a boolean unchanged', () => {
			expect(sanitizePayload(true)).toBe(true);
		});
	});

	describe('sensitive key masking', () => {
		it.each([
			['password', 'secret123'],
			['passwordHash', '$2b$10$hashedvalue'],
			['hash', 'sha256value'],
			['token', 'eyJhbGci...'],
			['accessToken', 'access-token-value'],
			['refreshToken', 'refresh-token-value'],
			['apiKey', 'api-key-value'],
			['api_key', 'api-key-value'],
			['secret', 'top-secret'],
			['authorization', 'Bearer xyz'],
			['cookie', 'session=abc'],
			['jwt', 'jwt.payload.sig'],
			['credentials', 'user:pass'],
		])('masks "%s"', (key, value) => {
			const result = sanitizePayload({ [key]: value }) as Record<string, unknown>;
			expect(result[key]).toBe('***');
		});

		it('is case-insensitive for key matching', () => {
			const result = sanitizePayload({ PASSWORD: 'pw', Token: 'tok' }) as Record<string, unknown>;
			expect(result.PASSWORD).toBe('***');
			expect(result.Token).toBe('***');
		});

		it('preserves the original key name while masking the value', () => {
			const result = sanitizePayload({ passwordHash: 'hash' }) as Record<string, unknown>;
			expect(Object.keys(result)).toContain('passwordHash');
			expect(result.passwordHash).toBe('***');
		});
	});

	describe('non-sensitive keys', () => {
		it('keeps non-sensitive values unchanged', () => {
			const result = sanitizePayload({ username: 'alice', status: 'active' }) as Record<
				string,
				unknown
			>;
			expect(result.username).toBe('alice');
			expect(result.status).toBe('active');
		});

		it('keeps numeric and boolean values unchanged', () => {
			const result = sanitizePayload({ count: 5, enabled: false }) as Record<string, unknown>;
			expect(result.count).toBe(5);
			expect(result.enabled).toBe(false);
		});
	});

	describe('mixed objects', () => {
		it('masks only the sensitive key among multiple keys', () => {
			const result = sanitizePayload({
				id: 'uuid-1',
				username: 'bob',
				passwordHash: '$2b$10$xyz',
				status: 'pending',
			}) as Record<string, unknown>;

			expect(result.id).toBe('uuid-1');
			expect(result.username).toBe('bob');
			expect(result.passwordHash).toBe('***');
			expect(result.status).toBe('pending');
		});

		it('does not mutate the original object', () => {
			const original = { password: 'secret', name: 'eve' };
			sanitizePayload(original);
			expect(original.password).toBe('secret');
		});
	});

	describe('arrays', () => {
		it('sanitizes each element of an array', () => {
			const result = sanitizePayload([
				{ username: 'a', password: 'pw1' },
				{ username: 'b', password: 'pw2' },
			]) as Array<Record<string, unknown>>;

			expect(result[0].username).toBe('a');
			expect(result[0].password).toBe('***');
			expect(result[1].username).toBe('b');
			expect(result[1].password).toBe('***');
		});

		it('passes through arrays of primitives unchanged', () => {
			expect(sanitizePayload([1, 'two', true])).toEqual([1, 'two', true]);
		});

		it('handles empty arrays', () => {
			expect(sanitizePayload([])).toEqual([]);
		});
	});

	describe('nested objects', () => {
		it('masks sensitive keys at arbitrary depth', () => {
			const result = sanitizePayload({
				user: {
					profile: {
						credentials: 'user:pass',
						displayName: 'Charlie',
					},
				},
			}) as Record<string, Record<string, Record<string, unknown>>>;

			expect(result.user.profile.credentials).toBe('***');
			expect(result.user.profile.displayName).toBe('Charlie');
		});

		it('masks sensitive keys inside arrays inside objects', () => {
			const result = sanitizePayload({
				users: [
					{ username: 'x', token: 'tok-x' },
					{ username: 'y', token: 'tok-y' },
				],
			}) as Record<string, Array<Record<string, unknown>>>;

			expect(result.users[0].token).toBe('***');
			expect(result.users[1].token).toBe('***');
			expect(result.users[0].username).toBe('x');
		});
	});

	describe('maxDepth', () => {
		it('returns "[max depth reached]" when depth is exhausted', () => {
			// depth=1: the top-level object is processed, but its children get depth=0
			const result = sanitizePayload({ nested: { deep: 'value' } }, 1) as Record<string, unknown>;
			expect(result.nested).toBe('[max depth reached]');
		});

		it('does not truncate when depth is sufficient', () => {
			const result = sanitizePayload({ a: { b: { c: 'ok' } } }, 5) as Record<
				string,
				Record<string, Record<string, unknown>>
			>;
			expect(result.a.b.c).toBe('ok');
		});
	});
});
