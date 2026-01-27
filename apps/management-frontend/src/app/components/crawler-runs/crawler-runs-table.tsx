import { useLayoutEffect, useRef, useState } from 'react';
import { CrawlerRunDto, CrawlerRunPhaseEnum } from '@/src/app/api/dto/crawler-runs/crawler-run.dto';
import { useCrawlerTemplates } from '@/src/app/api/hooks/useCrawlerTemplates';
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
import { useCrawlerRuns } from '../../api/hooks/useCrawlerRuns';

const DEFAULT_PAGE_SIZE = 20;
const TABLE_PAGINATION_SCROLL_KEY = '__crawler_runs_table_scroll__';

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
		startAfter?: boolean;
		endBefore?: boolean;
		phase?: boolean;
	};
}

function getPhaseClass(phase?: CrawlerRunPhaseEnum | string) {
	switch (phase) {
		case CrawlerRunPhaseEnum.PENDING:
			return 'bg-yellow-100 text-yellow-800';
		case CrawlerRunPhaseEnum.RUNNING:
			return 'bg-blue-100 text-blue-800';
		case CrawlerRunPhaseEnum.SUCCEEDED:
			return 'bg-green-100 text-green-800';
		case CrawlerRunPhaseEnum.FAILED:
			return 'bg-red-100 text-red-800';
		case CrawlerRunPhaseEnum.ERROR:
			return 'bg-rose-100 text-rose-800';
		default:
			return '';
	}
}

export default function CrawlerRunsTable({
	page,
	setPage,
	pageSize,
	scheduleName,
	scrollOnPaginate = false,
	visibleFilters = {
		namespace: true,
		template: true,
		startAfter: true,
		endBefore: true,
		phase: true,
	},
}: CrawlerRunsTableProps) {
	const [namespace, setNamespace] = useState('');
	const [crawlerTemplateName, setCrawlerTemplateName] = useState('');
	const [startedAfter, setStartedAfter] = useState<Date | undefined>();
	const [finishedBefore, setFinishedBefore] = useState<Date | undefined>();
	const [phases, setPhases] = useState<CrawlerRunPhaseEnum[]>([]);

	const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * effectivePageSize;

	const anchorRef = useRef<HTMLDivElement | null>(null);

	const { data, isLoading, error } = useCrawlerRuns({
		limit: effectivePageSize,
		offset,
		scheduleName,
		namespace: namespace || undefined,
		crawlerTemplateName: crawlerTemplateName || undefined,
		startedAfter: startedAfter || undefined,
		finishedBefore: finishedBefore || undefined,
		phases: phases.length ? phases : undefined,
	});

	const {
		data: templateData,
		isLoading: templatesIsLoading,
		error: templatesError,
	} = useCrawlerTemplates();
	const uniqueNamespaces = Array.from(new Set(templateData?.map((t) => t.namespace)));

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
			<div className="flex flex-wrap gap-4 m-4">
				{!templatesIsLoading && !templatesError && (
					<>
						{visibleFilters.namespace && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="w-48 justify-between">
										{namespace || 'Select namespace'}
									</Button>
								</DropdownMenuTrigger>

								<DropdownMenuContent className="w-48 p-2">
									<RadioGroup value={namespace} onValueChange={setNamespace}>
										{uniqueNamespaces?.map((namespace) => (
											<div key={namespace} className="flex items-center gap-3">
												<RadioGroupItem value={namespace} id={`namespace-${namespace}`} />
												<Label htmlFor={`namespace-${namespace}`}>{namespace}</Label>
											</div>
										))}
									</RadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						{visibleFilters.template && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="w-48 justify-between">
										{crawlerTemplateName || 'Select template'}
									</Button>
								</DropdownMenuTrigger>

								<DropdownMenuContent className="w-48 p-2">
									<RadioGroup value={crawlerTemplateName} onValueChange={setCrawlerTemplateName}>
										{templateData?.map((template) => (
											<div key={template.name} className="flex items-center gap-3">
												<RadioGroupItem value={template.name} id={`template-${template.name}`} />
												<Label htmlFor={`template-${template.name}`}>{template.name}</Label>
											</div>
										))}
									</RadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</>
				)}

				{visibleFilters.startAfter && (
					<Input
						type="datetime-local"
						value={startedAfter ? new Date(startedAfter).toISOString().slice(0, 16) : ''}
						onChange={(e) => setStartedAfter(e.target.value ? new Date(e.target.value) : undefined)}
						className="w-56"
					/>
				)}
				{visibleFilters.endBefore && (
					<Input
						type="datetime-local"
						value={finishedBefore ? new Date(finishedBefore).toISOString().slice(0, 16) : ''}
						onChange={(e) =>
							setFinishedBefore(e.target.value ? new Date(e.target.value) : undefined)
						}
						className="w-56"
					/>
				)}
				{visibleFilters.phase && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="w-48 justify-between">
								{phases.length > 0 ? phases.join(', ') : 'Filter by phase'}
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
				)}

				<Button
					variant="outline"
					onClick={() => {
						setNamespace('');
						setCrawlerTemplateName('');
						setStartedAfter(undefined);
						setFinishedBefore(undefined);
						setPhases([]);
					}}
				>
					Clear filters
				</Button>
			</div>

			{/* TABLE */}
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
								<TableRow key={run.name}>
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
				<p className="text-sm text-muted-foreground">
					{scheduleName ? 'No runs found for this schedule' : 'No runs found'}
				</p>
			)}
		</>
	);
}
