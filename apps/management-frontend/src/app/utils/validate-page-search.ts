export type PageSearch = { page?: number };

export function validatePageSearch(search: Record<string, unknown>): PageSearch {
	const raw = search.page;
	const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;

	// omit page from URL when page === 1
	const page = Number.isFinite(n) && n >= 2 ? Math.floor(n) : undefined;

	return { page };
}
