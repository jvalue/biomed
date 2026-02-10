import { useNavigate } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { useCrawlerTemplates } from '@/src/app/api/hooks/useCrawlerTemplates';
import { useSchedules } from '@/src/app/api/hooks/useSchedules';
import { getPhaseClass } from '@/src/app/components/crawler-runs/utils/get-phase-class';
import { PageAndFiltersSearch } from '@/src/app/components/crawler-runs/utils/search-schema';
import { Badge } from '@/src/app/components/design-components/badge';
import { Button } from '@/src/app/components/design-components/button';
import { DateTimePicker } from '@/src/app/components/design-components/date-time-picker/date-time-picker';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/src/app/components/design-components/dropdown-menu';
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
import { parseIsoDate } from '@/src/app/utils/datetime';
import { cn } from '@/src/utils';
import { useCrawlerRuns } from '../../api/hooks/useCrawlerRuns';

const DEFAULT_PAGE_SIZE = 20;
const TABLE_SCROLL_KEY = '__crawler_runs_table_scroll__';
const DEFAULT_FILTERS = {
	namespace: true,
	template: true,
	scheduleName: true,
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
		scheduleName?: boolean;
		startedAfter?: boolean;
		finishedBefore?: boolean;
		phase?: boolean;
	};
	search: PageAndFiltersSearch;
	updateSearch: (updater: (prev: PageAndFiltersSearch) => PageAndFiltersSearch) => void;
}
export default function CrawlerRunsTable({
	page,
	setPage,
	pageSize,
	scheduleName,
	scrollOnPaginate = false,
	visibleFilters,
	search,
	updateSearch,
}: CrawlerRunsTableProps) {
	const now = new Date();

	const namespace = search.namespace ?? '';
	const crawlerTemplateName = search.template ?? '';

	const scheduleFromSearch = search.scheduleName ?? '';
	const scheduleLockedByParent = !!scheduleName;
	// parent scheduleName takes precedence
	const effectiveScheduleName = scheduleName ?? (scheduleFromSearch || undefined);

	const startedAfter = parseIsoDate(search.startedAfter);
	const finishedBefore = parseIsoDate(search.finishedBefore);

	const phases = search.phases ?? [];

	const requestScrollToTable = () => {
		if (!scrollOnPaginate) return;
		sessionStorage.setItem(TABLE_SCROLL_KEY, '1');

		// immediate scroll so the user doesn’t see the top while loading
		requestAnimationFrame(() => {
			anchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
		});
	};

	// URL setters (also reset page)
	const setNamespace = (v: string) => {
		requestScrollToTable();
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			namespace: v || undefined,
		}));
	};

	const setCrawlerTemplateName = (v: string) => {
		requestScrollToTable();
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			template: v || undefined,
		}));
	};

	const setScheduleName = (v: string) => {
		requestScrollToTable();
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			scheduleName: v || undefined,
		}));
	};

	const setStartedAfter = (d?: Date) => {
		requestScrollToTable();
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			startedAfter: d ? d.toISOString() : undefined,
		}));
	};

	const setFinishedBefore = (d?: Date) => {
		requestScrollToTable();
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			finishedBefore: d ? d.toISOString() : undefined,
		}));
	};

	const setPhases = (updater: (prev: CrawlerRunPhaseEnum[]) => CrawlerRunPhaseEnum[]) => {
		requestScrollToTable();
		const next = updater(phases);

		updateSearch((prev) => ({
			...prev,
			page: undefined,
			phases: next.length ? next : undefined,
		}));
	};

	const clearFilters = () => {
		requestScrollToTable();
		updateSearch((prev) => ({
			...prev,
			page: undefined,
			namespace: undefined,
			template: undefined,
			startedAfter: undefined,
			finishedBefore: undefined,
			phases: undefined,
			scheduleName: undefined,
		}));
	};

	const filterOptions = {
		...DEFAULT_FILTERS,
		...(visibleFilters ?? {}),
		scheduleName:
			(DEFAULT_FILTERS.scheduleName ?? false) &&
			(visibleFilters?.scheduleName ?? true) &&
			!scheduleLockedByParent,
	};
	const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * effectivePageSize;
	const hasVisibleFilters =
		filterOptions.namespace ||
		filterOptions.template ||
		filterOptions.scheduleName ||
		filterOptions.startedAfter ||
		filterOptions.finishedBefore ||
		filterOptions.phase;

	const anchorRef = useRef<HTMLDivElement | null>(null);
	const navigate = useNavigate();

	const { data, isLoading, error } = useCrawlerRuns({
		limit: effectivePageSize,
		offset,
		scheduleName: effectiveScheduleName,
		namespace,
		crawlerTemplateName,
		startedAfter,
		finishedBefore,
		phases,
	});

	const {
		data: templateData,
		isLoading: templatesIsLoading,
		error: templatesError,
	} = useCrawlerTemplates({ enabled: filterOptions.namespace || filterOptions.template });

	const uniqueNamespaces = useMemo(() => {
		return Array.from(new Set((templateData ?? []).map((t) => t.namespace).filter(Boolean))).sort(
			(a, b) => a.localeCompare(b),
		);
	}, [templateData]);
	const uniqueTemplateNames = useMemo(() => {
		return Array.from(
			new Set(
				(templateData ?? [])
					.filter((t) => (namespace ? t.namespace === namespace : true))
					.map((t) => t.name)
					.filter(Boolean),
			),
		).sort((a, b) => a.localeCompare(b));
	}, [templateData, namespace]);

	const {
		data: scheduleData,
		isLoading: schedulesIsLoading,
		error: schedulesError,
	} = useSchedules({ enabled: filterOptions.scheduleName });
	const uniqueSchedules = useMemo(() => {
		return Array.from(new Set((scheduleData ?? []).map((s) => s.name).filter(Boolean))).sort(
			(a, b) => a.localeCompare(b),
		);
	}, [scheduleData]);

	useLayoutEffect(() => {
		if (!scrollOnPaginate) return;
		if (isLoading) return;

		const shouldScroll = sessionStorage.getItem(TABLE_SCROLL_KEY) === '1';
		if (!shouldScroll) return;
		if (!anchorRef.current) return;

		sessionStorage.removeItem(TABLE_SCROLL_KEY);

		requestAnimationFrame(() => {
			anchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
		});
	}, [scrollOnPaginate, isLoading]);

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
													all Namespaces
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
													all templates
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
				{!schedulesIsLoading && !schedulesError && filterOptions.scheduleName && (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Schedule:</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-9 w-48 justify-between font-normal"
								>
									<span
										className={
											effectiveScheduleName ? 'truncate' : 'truncate text-muted-foreground'
										}
									>
										{effectiveScheduleName || 'Schedule'}
									</span>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent className="w-48 p-2">
								<RadioGroup value={effectiveScheduleName} onValueChange={setScheduleName}>
									<div className="flex items-center gap-2 py-1">
										<RadioGroupItem value="" id="template-all" />
										<Label htmlFor="template-all" className="cursor-pointer">
											all schedules
										</Label>
									</div>

									{uniqueSchedules?.map((schedule) => (
										<div key={schedule} className="flex items-center gap-2 py-1">
											<RadioGroupItem value={schedule} id={`template-${schedule}`} />
											<Label htmlFor={`template-${schedule}`} className="cursor-pointer">
												{schedule}
											</Label>
										</div>
									))}
								</RadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
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
						<DateTimePicker
							value={startedAfter}
							onChange={setStartedAfter}
							granularity="minute"
							placeholder="Select date & time"
							className="h-9 w-48"
							maxDate={finishedBefore ?? now}
						/>
					</div>
				)}

				{filterOptions.finishedBefore && (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Finished Before:</span>
						<DateTimePicker
							value={finishedBefore}
							onChange={setFinishedBefore}
							granularity="minute"
							placeholder="Select date & time"
							className="h-9 w-48"
							minDate={startedAfter}
							maxDate={now}
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

			{/* anchor for scrolling */}
			<div ref={anchorRef} className="scroll-mt-24" />

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
												requestScrollToTable();
												setPage(page - 1, { scrollToTable: scrollOnPaginate });
											}}
										/>
									</PaginationItem>

									<PaginationItem>
										<PaginationNext
											disabled={!hasNextPage}
											onClick={() => {
												if (!hasNextPage) return;
												requestScrollToTable();
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
