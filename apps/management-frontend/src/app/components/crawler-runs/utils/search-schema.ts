import { CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import type { PageSearch } from '@/src/app/utils/validate-page-search';
import { validatePageSearch } from '@/src/app/utils/validate-page-search';

/* Filter search params */

export type FiltersSearch = {
	namespace?: string;
	template?: string;
	scheduleName?: string;

	// ISO strings in the URL
	startedAfter?: string;
	finishedBefore?: string;

	// repeated query param
	phases?: CrawlerRunPhaseEnum[];
};

export function validateFiltersSearch(search: Record<string, unknown>): FiltersSearch {
	const namespace =
		typeof search.namespace === 'string' && search.namespace.trim() ? search.namespace : undefined;

	const template =
		typeof search.template === 'string' && search.template.trim() ? search.template : undefined;

	const scheduleName =
		typeof search.scheduleName === 'string' && search.scheduleName.trim()
			? search.scheduleName
			: undefined;

	function parseISODateParam(value: unknown): string | undefined {
		if (typeof value !== 'string') return undefined;

		const trimmed = value.trim();
		if (!trimmed) return undefined;

		// strict ISO 8601 check
		const iso = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

		return iso.test(trimmed) ? trimmed : undefined;
	}

	const startedAfter = parseISODateParam(search.startedAfter);
	const finishedBefore = parseISODateParam(search.finishedBefore);

	const validPhases = new Set(Object.values(CrawlerRunPhaseEnum));

	const phasesRaw = (
		Array.isArray(search.phases)
			? search.phases
			: typeof search.phases === 'string'
				? [search.phases]
				: []
	).filter((p): p is CrawlerRunPhaseEnum => validPhases.has(p as CrawlerRunPhaseEnum));
	const phases = phasesRaw.length ? phasesRaw : undefined;

	return {
		namespace,
		template,
		scheduleName,
		startedAfter,
		finishedBefore,
		phases,
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
