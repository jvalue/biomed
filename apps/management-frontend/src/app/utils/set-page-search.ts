export type SetPageOpts = { scrollToTable?: boolean };

export function createSetPageSearch(
	navigate: (opts: {
		search: (prev: { page?: number }) => { page?: number };
		resetScroll?: boolean;
	}) => void,
) {
	return (nextPage: number, opts?: SetPageOpts) => {
		const p = Math.max(1, nextPage);

		navigate({
			search: (prev) => ({
				...prev,
				page: p >= 2 ? p : undefined, // omit on page 1
			}),
			resetScroll: !(opts?.scrollToTable === true),
		});
	};
}
