import { useNavigate } from '@tanstack/react-router';

type AnySearch = Record<string, unknown>;

export function useLooseSearchNavigate<TSearch extends AnySearch = AnySearch>() {
	const navigate = useNavigate();

	type NavigateFn = typeof navigate;
	type NavigateOpts = Parameters<NavigateFn>[0];
	type SearchParam = NavigateOpts extends { search?: infer S } ? S : never;
	type SearchReducer = Exclude<NonNullable<SearchParam>, true>;

	return (updater: (prev: TSearch) => TSearch) => {
		navigate({
			resetScroll: false,
			search: updater as unknown as SearchReducer,
		});
	};
}
