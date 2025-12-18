import { describe, expect, it } from 'vitest';
import { ArgoCursorPaginatedListDto } from '../dto/argo-cursor-paginated-list-dto';
import { mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto } from './argo.mapper';

describe('mapCursorPaginatedListDtoToCursorBasedPaginationResponseDto', () => {
	// biome-ignore lint/suspicious/noExplicitAny: <mapping function for test purposes>
	const mapItem = (input: any) => ({ id: input.id, value: `${input.v}e` });

	it('returns empty data when items are undefined', () => {
		const dto: ArgoCursorPaginatedListDto<unknown> = {
			metadata: {},
		} as unknown as ArgoCursorPaginatedListDto<unknown>;
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.data).toEqual([]);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('hasMore false for metadata.continue = null', () => {
		const dto: ArgoCursorPaginatedListDto<unknown> = {
			items: [],
			metadata: { resourceVersion: 'abc', continue: null },
		};
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('hasMore false for metadata.continue = 0 (number)', () => {
		const dto: ArgoCursorPaginatedListDto<unknown> = {
			items: [],
			metadata: { resourceVersion: 'abc', continue: 0 },
		};
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('hasMore true for metadata.continue > 0 (number)', () => {
		const dto: ArgoCursorPaginatedListDto<unknown> = {
			items: [],
			metadata: { resourceVersion: 'abc', continue: 5 },
		};
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(true);
	});

	it('hasMore false for metadata.continue = undefined', () => {
		const dto: ArgoCursorPaginatedListDto<unknown> = {
			items: [],
			metadata: { resourceVersion: 'abc', continue: undefined },
		};
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.metadata.hasMore).toBe(false);
	});

	it('preserves mapping for multiple items', () => {
		const dto: ArgoCursorPaginatedListDto<unknown> = {
			items: [
				{ id: 1, v: 'a' },
				{ id: 2, v: 'b' },
			],
			metadata: { resourceVersion: 'abc', continue: 5 },
		};
		const res = mapArgoCursorPaginatedListDtoToCursorBasedPaginationResponseDto(dto, mapItem);
		expect(res.data).toEqual([
			{ id: 1, value: 'ae' },
			{ id: 2, value: 'be' },
		]);
		expect(res.metadata.hasMore).toBe(true);
	});
});
