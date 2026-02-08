import { useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { useCrawlerTemplates } from '@/src/app/api/hooks/useCrawlerTemplates';
import { getPhaseClass } from '@/src/app/components/crawler-runs/utils/get-phase-class';
import { useLooseSearchNavigate } from '@/src/app/components/crawler-runs/utils/useLooseSearchNavigate';
import { Badge } from '@/src/app/components/design-components/badge';
import { Button } from '@/src/app/components/design-components/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/src/app/components/design-components/dropdown-menu';
import { Input } from '@/src/app/components/design-components/input';
import { Label } from '@/src/app/components/design-components/label';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from '@/src/app/components/design-components/pagination';
import { RadioGroup, RadioGroupItem } from '@/src/app/components/design-components/radio-group';
import { Spinner } from '@/src/app/components/design-components/spinner';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';
import {
	fromDatetimeLocalValue,
	parseIsoDate,
	toDatetimeLocalValue,
} from '@/src/app/utils/datetime';
import { cn } from '@/src/utils';
import { useCrawlerRuns } from '../../api/hooks/useCrawlerRuns';

const DEFAULT_PAGE_SIZE = 20;
const TABLE_PAGINATION_SCROLL_KEY = '__crawler_runs_table_scroll__';
const DEFAULT_FILTERS = {
	namespace: true,
	template: true,
	startedAfter: true,
	finishedBefore: true,
	phase: true,
};

export interface CrawlerRunsTableProps {
	page: number;
	setPage: (page: number, opts?: { scrollToTable?: boolean }) => void;
	pageSize?: number;
	scheduleName?: string;
	/** When enabled, scrolls back to the table top after pagination changes. Useful when the table appears in the middle or bottom of the page. */
	scrollOnPaginate?: boolean;
	visibleFilters?: {
		namespace?: boolean;
		template?: boolean;
		startedAfter?: boolean;
		finishedBefore?: boolean;
		phase?: boolean;
	};
}
function normalizeStringArray(v: unknown): string[] {
	if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
	if (typeof v === 'string') return [v];
	return [];
}
export default function CrawlerRunsTable({
	page,
	setPage,
	pageSize,
	scheduleName,
	scrollOnPaginate = false,
	visibleFilters,
}: CrawlerRunsTableProps) {
	const updateSearch = useLooseSearchNavigate();
	const search = useSearch({ strict: false }) as Record<string, unknown>;

	const namespace = typeof search.namespace === 'string' ? search.namespace : '';
	const crawlerTemplateName = typeof search.template === 'string' ? search.template : '';

	const startedAfter = parseIsoDate(search.startedAfter);
	const finishedBefore = parseIsoDate(search.finishedBefore);

	const phases = normalizeStringArray(search.phases) as CrawlerRunPhaseEnum[];

	// URL setters (also reset page)
	const setNamespace = (v: string) =>
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			namespace: v || undefined,
		}));

	const setCrawlerTemplateName = (v: string) =>
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			template: v || undefined,
		}));

	const setStartedAfter = (d?: Date) =>
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			startedAfter: d ? d.toISOString() : undefined,
		}));

	const setFinishedBefore = (d?: Date) =>
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			finishedBefore: d ? d.toISOString() : undefined,
		}));

	const setPhases = (updater: (prev: CrawlerRunPhaseEnum[]) => CrawlerRunPhaseEnum[]) => {
		const next = updater(phases);

		updateSearch((prevSearch) => ({
			...prevSearch,
			page: undefined,
			phases: next.length ? next : undefined,
		}));
	};

	const clearFilters = () =>
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			namespace: undefined,
			template: undefined,
			startedAfter: undefined,
			finishedBefore: undefined,
			phases: undefined,
		}));

	const filterOptions = {
		...DEFAULT_FILTERS,
		...(visibleFilters ?? {}),
	};
	const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * effectivePageSize;
	const hasVisibleFilters =
		filterOptions.namespace ||
		filterOptions.template ||
		filterOptions.startedAfter ||
		filterOptions.finishedBefore ||
		filterOptions.phase;

	const anchorRef = useRef<HTMLDivElement | null>(null);
	const navigate = useNavigate();

	const { data, isLoading, error } = useCrawlerRuns({
		limit: effectivePageSize,
		offset,
		scheduleName,
		namespace,
		crawlerTemplateName,
		startedAfter,
		finishedBefore,
		phases,
	});

	const shouldFetchTemplates = filterOptions.namespace || filterOptions.template;
	const {
		data: templateData,
		isLoading: templatesIsLoading,
		error: templatesError,
	} = useCrawlerTemplates({ enabled: shouldFetchTemplates });

	const uniqueNamespaces = Array.from(
		new Set((templateData ?? []).map((t) => t.namespace).filter(Boolean)),
	).sort((a, b) => a.localeCompare(b));
	const uniqueTemplateNames = Array.from(
		new Set(
			(templateData ?? [])
				.filter((t) => (namespace ? t.namespace === namespace : true))
				.map((t) => t.name)
				.filter(Boolean),
		),
	).sort((a, b) => a.localeCompare(b));

	useLayoutEffect(() => {
		if (!scrollOnPaginate) return;

		const shouldScroll = sessionStorage.getItem(TABLE_PAGINATION_SCROLL_KEY) === '1';
		if (!shouldScroll) return;

		// wait until data is there and anchor exists
		if (isLoading) return;
		if (!anchorRef.current) return;

		sessionStorage.removeItem(TABLE_PAGINATION_SCROLL_KEY);

		requestAnimationFrame(() => {
			anchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
		});
	}, [scrollOnPaginate, page, isLoading, anchorRef]);

	const runs: CrawlerRunDto[] = data?.data ?? [];
	const hasNextPage = !!data?.metadata?.hasMore;
	const canPrev = page > 1;

	if (error) {
		return (
			<>
				<div ref={anchorRef} className="scroll-mt-24" />
				<p>Couldn’t load crawler runs right now. Please try again.</p>
			</>
		);
	}

	return (
		<>
			{/* anchor for scrolling */}
			<div ref={anchorRef} className="scroll-mt-24" />

			{/* filter bar */}
			<div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/40 p-3 shadow-md m-3 mt-8">
				{!templatesIsLoading && !templatesError && (
					<>
						{filterOptions.namespace && (
							<div className="flex flex-col gap-1">
								<span className="text-xs text-muted-foreground">Namespace:</span>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="h-9 w-48 justify-between font-normal"
										>
											<span className={namespace ? 'truncate' : 'truncate text-muted-foreground'}>
												{namespace || 'Namespace'}
											</span>
											<ChevronDown className="h-4 w-4 opacity-50" />
										</Button>
									</DropdownMenuTrigger>

									<DropdownMenuContent className="w-48 p-2">
										<RadioGroup value={namespace} onValueChange={setNamespace}>
											<div className="flex items-center gap-2 py-1">
												<RadioGroupItem value="" id="ns-all" />
												<Label htmlFor="ns-all" className="cursor-pointer">
													All Namespaces
												</Label>
											</div>

											{uniqueNamespaces?.map((ns) => (
												<div key={ns} className="flex items-center gap-2 py-1">
													<RadioGroupItem value={ns} id={`ns-${ns}`} />
													<Label htmlFor={`ns-${ns}`} className="cursor-pointer">
														{ns}
													</Label>
												</div>
											))}
										</RadioGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)}

						{filterOptions.template && (
							<div className="flex flex-col gap-1">
								<span className="text-xs text-muted-foreground">Template:</span>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="h-9 w-48 justify-between font-normal"
										>
											<span
												className={
													crawlerTemplateName ? 'truncate' : 'truncate text-muted-foreground'
												}
											>
												{crawlerTemplateName || 'Template'}
											</span>
											<ChevronDown className="h-4 w-4 opacity-50" />
										</Button>
									</DropdownMenuTrigger>

									<DropdownMenuContent className="w-48 p-2">
										<RadioGroup value={crawlerTemplateName} onValueChange={setCrawlerTemplateName}>
											<div className="flex items-center gap-2 py-1">
												<RadioGroupItem value="" id="template-all" />
												<Label htmlFor="template-all" className="cursor-pointer">
													All templates
												</Label>
											</div>

											{uniqueTemplateNames?.map((template) => (
												<div key={template} className="flex items-center gap-2 py-1">
													<RadioGroupItem value={template} id={`template-${template}`} />
													<Label htmlFor={`template-${template}`} className="cursor-pointer">
														{template}
													</Label>
												</div>
											))}
										</RadioGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)}
					</>
				)}

				{filterOptions.phase && (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Phase:</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-9 w-48 justify-between font-normal"
								>
									<div className="flex max-w-[10rem] items-center gap-1 overflow-hidden">
										{phases.length === 0 ? (
											<span className="text-muted-foreground">Phase</span>
										) : phases.length <= 2 ? (
											phases.map((phase) => (
												<Badge
													key={phase}
													className={cn(
														'px-1.5 py-0 text-[10px] font-normal',
														getPhaseClass(phase),
													)}
												>
													{phase}
												</Badge>
											))
										) : (
											<Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
												{phases.length} selected
											</Badge>
										)}
									</div>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent className="w-48">
								{Object.values(CrawlerRunPhaseEnum).map((phase) => (
									<DropdownMenuCheckboxItem
										key={phase}
										checked={phases.includes(phase)}
										onCheckedChange={(checked) => {
											setPhases((prev) =>
												checked ? [...prev, phase] : prev.filter((p) => p !== phase),
											);
										}}
									>
										{phase}
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}

				{filterOptions.startedAfter && (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Started After:</span>
						<Input
							type="datetime-local"
							value={startedAfter ? toDatetimeLocalValue(startedAfter) : ''}
							onChange={(e) =>
								setStartedAfter(e.target.value ? fromDatetimeLocalValue(e.target.value) : undefined)
							}
							className="h-9 w-48"
						/>
					</div>
				)}

				{filterOptions.finishedBefore && (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Finished Before:</span>
						<Input
							type="datetime-local"
							value={finishedBefore ? toDatetimeLocalValue(finishedBefore) : ''}
							onChange={(e) =>
								setFinishedBefore(
									e.target.value ? fromDatetimeLocalValue(e.target.value) : undefined,
								)
							}
							className="h-9 w-48"
						/>
					</div>
				)}

				{hasVisibleFilters && (
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto h-9 text-muted-foreground hover:text-destructive"
						onClick={clearFilters}
					>
						Clear filters
					</Button>
				)}
			</div>

			{/* table */}
			{isLoading ? (
				<div className="col-span-12 flex justify-center pt-6">
					<Spinner className="size-10" />
				</div>
			) : runs.length > 0 ? (
				<>
					<Table className="m-4 mt-6">
						<TableCaption>Crawler runs.</TableCaption>

						<TableHeader>
							<TableRow>
								<TableHead className="text-primary">Name/ID</TableHead>
								<TableHead className="text-primary">Namespace</TableHead>
								<TableHead className="text-primary">Crawler Template</TableHead>
								<TableHead className="text-primary">Schedule</TableHead>
								<TableHead className="text-primary">Phase</TableHead>
								<TableHead className="text-primary">Started at</TableHead>
								<TableHead className="text-primary">Finished at</TableHead>
							</TableRow>
						</TableHeader>

						<TableBody>
							{runs.map((run) => (
								<TableRow
									key={run.name}
									className="cursor-pointer hover:bg-gray-50"
									onClick={() =>
										navigate({
											to: '/crawler-runs/$crawlerRunNamespace/$crawlerRunId',
											params: { crawlerRunNamespace: run.namespace, crawlerRunId: run.name },
										})
									}
								>
									<TableCell>{run.name}</TableCell>
									<TableCell>{run.namespace}</TableCell>
									<TableCell>{run.crawlerTemplateName}</TableCell>

									<TableCell className={!run.scheduleName ? 'text-muted-foreground' : ''}>
										{run.scheduleName ?? '-'}
									</TableCell>

									<TableCell>
										<span
											className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold ${getPhaseClass(
												run.phase,
											)}`}
										>
											{run.phase}
										</span>
									</TableCell>

									<TableCell className={!run.startedAt ? 'text-muted-foreground' : ''}>
										{run.startedAt ? new Date(run.startedAt).toLocaleString() : 'not yet started'}
									</TableCell>

									<TableCell className={!run.finishedAt ? 'text-muted-foreground' : ''}>
										{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="mt-4">
						{(canPrev || hasNextPage) && (
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											disabled={!canPrev}
											onClick={() => {
												if (!canPrev) return;
												if (scrollOnPaginate) {
													sessionStorage.setItem(TABLE_PAGINATION_SCROLL_KEY, '1');
												}
												setPage(page - 1, { scrollToTable: scrollOnPaginate });
											}}
										/>
									</PaginationItem>

									<PaginationItem>
										<PaginationNext
											disabled={!hasNextPage}
											onClick={() => {
												if (!hasNextPage) return;
												if (scrollOnPaginate) {
													sessionStorage.setItem(TABLE_PAGINATION_SCROLL_KEY, '1');
												}
												setPage(page + 1, { scrollToTable: scrollOnPaginate });
											}}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						)}
					</div>
				</>
			) : (
				<div className="flex justify-center items-center py-8">
					<p className="text-sm text-muted-foreground text-center">
						{scheduleName ? 'No runs found for this schedule' : 'No runs found'}
					</p>
				</div>
			)}
		</>
	);
}
