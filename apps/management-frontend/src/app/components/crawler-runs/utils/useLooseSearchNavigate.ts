import { useNavigate } from '@tanstack/react-router';

type SearchRecord = Record<string, unknown>;

export function useLooseSearchNavigate() {
	const navigate = useNavigate();

	type NavigateFn = typeof navigate;
	type NavigateOpts = Parameters<NavigateFn>[0];

	type SearchParam = NavigateOpts extends { search?: infer S } ? S : never;
	type SearchReducer = Exclude<NonNullable<SearchParam>, true>;

	return (updater: (prev: SearchRecord) => SearchRecord) => {
		navigate({
			search: updater as unknown as SearchReducer,
		});
	};
}
