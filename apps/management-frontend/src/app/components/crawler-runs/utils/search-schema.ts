import type { PageSearch } from '@/src/app/utils/validate-page-search';
import { validatePageSearch } from '@/src/app/utils/validate-page-search';

/* Filter search params */

export type FiltersSearch = {
	namespace?: string;
	template?: string;

	// ISO strings in the URL
	startedAfter?: string;
	finishedBefore?: string;

	// repeated query param
	phases?: string[];
};

export function validateFiltersSearch(search: Record<string, unknown>): FiltersSearch {
	const namespace =
		typeof search.namespace === 'string' && search.namespace.trim() ? search.namespace : undefined;

	const template =
		typeof search.template === 'string' && search.template.trim() ? search.template : undefined;

	const startedAfter =
		typeof search.startedAfter === 'string' && search.startedAfter.trim()
			? search.startedAfter
			: undefined;

	const finishedBefore =
		typeof search.finishedBefore === 'string' && search.finishedBefore.trim()
			? search.finishedBefore
			: undefined;

	const rawPhases = search.phases;
	const phasesArray = Array.isArray(rawPhases)
		? rawPhases
		: typeof rawPhases === 'string'
			? [rawPhases]
			: [];

	const phases = phasesArray.filter(
		(p): p is string => typeof p === 'string' && p.trim().length > 0,
	);

	return {
		namespace,
		template,
		startedAfter,
		finishedBefore,
		phases: phases.length ? phases : undefined,
	};
}

/* Combined search params (pagination + filters) */
export type PageAndFiltersSearch = PageSearch & FiltersSearch;

export function validatePageAndFiltersSearch(
	search: Record<string, unknown>,
): PageAndFiltersSearch {
	return {
		...validatePageSearch(search),
		...validateFiltersSearch(search),
	};
}
