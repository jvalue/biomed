import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { useScheduleHistoricalMetrics } from '@/src/app/api/hooks/useScheduleMetrics';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/src/app/components/design-components/select';
import { Spinner } from '@/src/app/components/design-components/spinner';

interface ScheduleMetricsChartProps {
	scheduleName: string;
	scheduleNamespace: string;
}

type DateRange = 'all' | '365' | '180' | '90' | '30' | '7';
type MetricType = 'newDatasets' | 'crawledDataSets' | 'newDatasetsPercentage';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
	all: 'All Time',
	'365': 'Last Year',
	'180': 'Last 6 Months',
	'90': 'Last 3 Months',
	'30': 'Last Month',
	'7': 'Last Week',
};

const METRIC_LABELS: Record<MetricType, string> = {
	newDatasets: 'New Datasets',
	crawledDataSets: 'Crawled Datasets',
	newDatasetsPercentage: 'New Datasets Percentage',
};

export default function ScheduleMetricsChartComponent({
	scheduleName,
	scheduleNamespace,
}: ScheduleMetricsChartProps) {
	const [dateRange, setDateRange] = useState<DateRange>('90');
	const [selectedMetric, setSelectedMetric] = useState<MetricType>('newDatasets');

	const { fromDate, toDate } = useMemo(() => {
		const to = new Date();
		if (dateRange === 'all') {
			return { fromDate: undefined, toDate: undefined };
		}
		const from = new Date();
		from.setDate(from.getDate() - parseInt(dateRange));
		return { fromDate: from, toDate: to };
	}, [dateRange]);

	const { data, isLoading, error } = useScheduleHistoricalMetrics(
		scheduleName,
		scheduleNamespace,
		fromDate,
		toDate,
	);

	const chartOption = useMemo(() => {
		if (!data || data.length === 0) {
			return {
				title: {
					text: 'No data available',
					left: 'center',
					top: 'center',
					textStyle: {
						color: 'hsl(var(--muted-foreground))',
						fontSize: 16,
					},
				},
			};
		}

		// Sort data safely by date
		const sortedData = [...data]
			.filter((item) => item.date) // Ensure date exists
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		const dates = sortedData.map((item) =>
			new Date(item.date).toLocaleDateString('en-US', {
				day: '2-digit',
				month: 'short',
			}),
		);

		//TODO: adjust colors to match design system
		const COLOR_FOREGROUND = 'rgba(2,8,23,1)'; // --foreground #020817
		const COLOR_MUTED_FOREGROUND = 'rgba(100,116,139,1)'; // --muted-foreground #64748b
		const COLOR_BORDER = 'rgba(226,232,240,1)'; // --border #e2e8f0
		const COLOR_BACKGROUND = 'rgba(255,255,255,1)'; // --background #ffffff

		let metricData: number[];
		let metricName: string;
		let metricColor: string;
		// provide safe defaults so we don't need non-null assertions later
		let areaStartColor: string = 'rgba(0,0,0,0)';
		let areaEndColor: string = 'rgba(0,0,0,0)';
		let yAxisConfig: Record<string, unknown> = {};
		let showPercentage = false;

		switch (selectedMetric) {
			case 'crawledDataSets':
				metricData = sortedData.map((item) => item.crawledDataSets ?? 0);
				metricName = 'Crawled Datasets';
				metricColor = 'rgba(37,99,235,1)';
				areaStartColor = 'rgba(37,99,235,0.30)'; // 30% opacity
				areaEndColor = 'rgba(37,99,235,0.05)'; // 5% opacity
				yAxisConfig = {
					type: 'value',
					name: 'Datasets',
					position: 'left',
					axisLine: {
						lineStyle: {
							color: COLOR_MUTED_FOREGROUND,
						},
					},
					splitLine: {
						lineStyle: {
							color: COLOR_BORDER,
							type: 'dashed',
						},
					},
				};
				break;
			case 'newDatasets':
				metricData = sortedData.map((item) => item.newDatasets ?? 0);
				metricName = 'New Datasets';
				metricColor = 'rgba(42,157,144,1)';
				areaStartColor = 'rgba(42,157,144,0.30)';
				areaEndColor = 'rgba(42,157,144,0.05)';
				yAxisConfig = {
					type: 'value',
					name: 'Datasets',
					position: 'left',
					axisLine: {
						lineStyle: {
							color: COLOR_MUTED_FOREGROUND,
						},
					},
					splitLine: {
						lineStyle: {
							color: COLOR_BORDER,
							type: 'dashed',
						},
					},
				};
				break;
			case 'newDatasetsPercentage':
				metricData = sortedData.map((item) =>
					item.newDatasetsPercentage != null
						? Number((item.newDatasetsPercentage * 100).toFixed(1))
						: 0,
				);
				metricName = 'New Datasets Percentage';
				metricColor = 'rgba(244,164,98,1)';
				showPercentage = true;
				areaStartColor = 'rgba(244,164,98,0.30)';
				areaEndColor = 'rgba(244,164,98,0.05)';
				yAxisConfig = {
					type: 'value',
					name: 'Percentage',
					position: 'left',
					axisLine: {
						lineStyle: {
							color: COLOR_MUTED_FOREGROUND,
						},
					},
					axisLabel: {
						formatter: '{value}%',
					},
					min: 0,
					max: 100,
					splitLine: {
						lineStyle: {
							color: COLOR_BORDER,
							type: 'dashed',
						},
					},
				};
				break;
		}

		return {
			tooltip: {
				trigger: 'axis',
				backgroundColor: COLOR_BACKGROUND,
				borderColor: COLOR_BORDER,
				textStyle: {
					color: COLOR_FOREGROUND,
				},
				axisPointer: {
					type: 'cross',
					crossStyle: {
						color: COLOR_MUTED_FOREGROUND,
					},
				},
				formatter: (params: unknown) => {
					if (!params || !Array.isArray(params) || params.length === 0) return '';
					const param = (params as Array<Record<string, unknown>>)[0];
					if (!param) return '';
					const value = showPercentage
						? `${(param.value as number | string) ?? ''}%`
						: ((param.value as number | string) ?? '');
					// Handle potential undefined axisValue
					const label = (param.axisValue as string) || (param.name as string) || '';
					const marker = (param.marker as string) || '';
					const seriesName = (param.seriesName as string) || '';
					return `${label}<br/>${marker}${seriesName}: ${value}`;
				},
			},
			legend: {
				data: [metricName],
				bottom: 0,
				textStyle: {
					color: COLOR_FOREGROUND,
				},
			},
			grid: {
				left: '3%',
				right: '4%',
				bottom: '60px',
				top: '20px',
				containLabel: true,
			},
			xAxis: {
				type: 'category',
				boundaryGap: false,
				data: dates,
				axisLine: {
					lineStyle: {
						color: COLOR_MUTED_FOREGROUND,
					},
				},
			},
			yAxis: yAxisConfig,
			series: [
				{
					name: metricName,
					type: 'line',
					smooth: false,
					data: metricData,
					itemStyle: {
						color: metricColor,
					},
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: areaStartColor },
								{ offset: 1, color: areaEndColor },
							],
						},
					},
					lineStyle: {
						width: 2,
					},
					emphasis: {
						focus: 'series',
					},
					connectNulls: true, // Changed to true to connect lines over potential gaps if any
				},
			],
			animation: false,
		};
	}, [data, selectedMetric]);

	if (isLoading) {
		return (
			<Card className="shadow-lg">
				<CardHeader className="border-b">
					<CardTitle className="text-xl">Metrics History</CardTitle>
				</CardHeader>
				<CardContent className="pt-6 flex justify-center items-center min-h-[500px]">
					<Spinner className="size-10" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="shadow-lg">
				<CardHeader className="border-b">
					<CardTitle className="text-xl">Metrics History</CardTitle>
				</CardHeader>
				<CardContent className="pt-6">
					<p className="text-red-600">Error loading metrics: {error.message}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="shadow-lg">
			<CardHeader className="border-b">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<CardTitle className="text-xl">Metrics History</CardTitle>
						<CardDescription>Historical crawler metrics over time</CardDescription>
					</div>
					<div className="flex gap-3">
						<Select
							value={selectedMetric}
							onValueChange={(value) => setSelectedMetric(value as MetricType)}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select metric" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(METRIC_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Select range" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>

			<CardContent className="pt-6">
				{!data || data.length === 0 ? (
					<div className="text-center text-muted-foreground py-12">
						No metrics data available for the selected time range.
					</div>
				) : (
					<ReactECharts
						key={`${selectedMetric}-${dateRange}`} // Force re-render on changes to avoid interpolation errors
						option={chartOption}
						style={{ height: '450px', width: '100%' }}
						notMerge={true}
					/>
				)}
			</CardContent>
		</Card>
	);
}
