import { describe, expect, it } from 'vitest';
import { mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto } from './argo.mapper';

describe('mapCursorPaginatedListDtoToCursorBasedPaginationResponseDto', () => {
	const mapItem = (input: any) => ({ id: input.id, value: input.v + 'e' });

	it('returns empty data when items are undefined', () => {
		const dto: any = { metadata: {} };
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.data).toEqual([]);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('hasMore false for metadata.continue = null', () => {
		const dto: any = { items: [], metadata: { continue: null } };
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('hasMore false for metadata.continue = 0 (number)', () => {
		const dto: any = { items: [], metadata: { continue: 0 } };
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('hasMore true for metadata.continue > 0 (number)', () => {
		const dto: any = { items: [], metadata: { continue: 5 } };
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(true);
	});

	it("hasMore false for metadata.continue = '0' (string)", () => {
		const dto: any = { items: [], metadata: { continue: '0' } };
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(false);
	});

	it("hasMore false for metadata.continue = '' (empty string)", () => {
		const dto: any = { items: [], metadata: { continue: '' } };
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('preserves mapping for multiple items', () => {
		const dto: any = {
			items: [
				{ id: 1, v: 'a' },
				{ id: 2, v: 'b' },
			],
			metadata: { continue: 5 },
		};
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.data).toEqual([
			{ id: 1, value: 'ae' },
			{ id: 2, value: 'be' },
		]);
		expect(res.metadata.hasMore).toBe(true);
	});
});
