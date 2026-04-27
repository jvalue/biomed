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

// Configuration object for metrics to avoid switch statements and duplicate code
interface MetricConfig {
	label: string;
	color: string;
	areaStartColor: string;
	areaEndColor: string;
	yAxisName: string;
	isPercentage?: boolean;
}

interface EChartsTooltipParam {
	value: number | string;
	axisValue: string;
	marker: string;
	seriesName: string;
}

const METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
	newDatasets: {
		label: 'New Datasets',
		color: 'rgba(22, 163, 74, 1)', // Green
		areaStartColor: 'rgba(22, 163, 74, 0.3)',
		areaEndColor: 'rgba(22, 163, 74, 0.05)',
		yAxisName: 'Datasets',
	},
	crawledDataSets: {
		label: 'Crawled Datasets',
		color: 'rgba(37, 99, 235, 1)', // Blue
		areaStartColor: 'rgba(37, 99, 235, 0.3)',
		areaEndColor: 'rgba(37, 99, 235, 0.05)',
		yAxisName: 'Datasets',
	},
	newDatasetsPercentage: {
		label: 'New Datasets Percentage',
		color: 'rgba(244, 164, 98, 1)', // Orange
		areaStartColor: 'rgba(244, 164, 98, 0.3)',
		areaEndColor: 'rgba(244, 164, 98, 0.05)',
		yAxisName: 'Percentage',
		isPercentage: true,
	},
};

export default function ScheduleMetricsChartComponent({
	scheduleName,
	scheduleNamespace,
}: ScheduleMetricsChartProps) {
	const [dateRange, setDateRange] = useState<DateRange>('90');
	const [selectedMetric, setSelectedMetric] = useState<MetricType>('newDatasets');

	// Calculate date range for API query
	const { fromDate, toDate } = useMemo(() => {
		const to = new Date();
		if (dateRange === 'all') {
			return { fromDate: undefined, toDate: undefined };
		}
		const from = new Date();
		from.setDate(from.getDate() - parseInt(dateRange, 10));
		return { fromDate: from, toDate: to };
	}, [dateRange]);

	const { data, isLoading, error } = useScheduleHistoricalMetrics(
		scheduleNamespace,
		scheduleName,
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

		// Get configuration for current metric
		const config = METRIC_CONFIGS[selectedMetric];

		// Map data based on selected metric key
		const metricData = sortedData.map((item) => {
			const value = item[selectedMetric] ?? 0;
			return config.isPercentage ? Number((value * 100).toFixed(1)) : value;
		});

		// Build Y-Axis configuration
		const yAxisConfig = {
			type: 'value',
			name: config.yAxisName,
			nameLocation: 'middle',
			nameGap: 40,
			position: 'left',
			splitLine: {
				show: true,
				lineStyle: {
					type: 'dashed',
					color: 'rgba(0, 0, 0, 0.1)', // Subtle grid lines
				},
			},
			...(config.isPercentage && {
				axisLabel: { formatter: '{value}%' },
				min: 0,
				max: 100,
			}),
		};

		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'cross' },
				formatter: (params: EChartsTooltipParam | EChartsTooltipParam[]) => {
					if (!Array.isArray(params) || params.length === 0) return '';
					const p = params[0];
					const value = config.isPercentage ? `${p.value}%` : p.value;
					return `${p.axisValue}<br/>${p.marker}${p.seriesName}: ${value}`;
				},
			},
			legend: {
				data: [config.label],
				bottom: 0,
			},
			visualMap: config.isPercentage
				? {
						show: false,
						dimension: 1,
						pieces: [
							{ gt: 30, color: 'rgba(220, 38, 38, 1)' }, // Red (> 30%)
							{ gt: 20, lte: 30, color: 'rgba(244, 164, 98, 1)' }, // Orange (20-30%)
							{ gte: 10, lte: 20, color: 'rgba(22, 163, 74, 1)' }, // Green (10-20%)
							{ gte: 5, lt: 10, color: 'rgba(244, 164, 98, 1)' }, // Orange (5-10%)
							{ lt: 5, color: 'rgba(220, 38, 38, 1)' }, // Red (< 5%)
						],
						outOfRange: {
							color: 'rgba(22, 163, 74, 1)',
						},
					}
				: undefined,
			grid: {
				left: '3%',
				right: '4%',
				bottom: '60px',
				top: '20px', // Increased top padding for axis title
				containLabel: true,
			},
			xAxis: {
				type: 'category',
				boundaryGap: false,
				data: dates,
			},
			yAxis: yAxisConfig,
			series: [
				{
					name: config.label,
					type: 'line',
					smooth: false,
					data: metricData,
					itemStyle: config.isPercentage
						? undefined
						: {
								color: config.color,
							},
					areaStyle: config.isPercentage
						? {
								opacity: 0.25,
							}
						: {
								color: {
									type: 'linear',
									x: 0,
									y: 0,
									x2: 0,
									y2: 1,
									colorStops: [
										{ offset: 0, color: config.areaStartColor },
										{ offset: 1, color: config.areaEndColor },
									],
								},
							},
					lineStyle: {
						width: 2,
					},
					emphasis: {
						focus: 'series',
					},
					connectNulls: true,
				},
			],
			animation: true,
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
							<SelectTrigger className="w-[220px]">
								<SelectValue placeholder="Select metric" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(METRIC_CONFIGS).map(([value, config]) => (
									<SelectItem key={value} value={value}>
										{config.label}
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
						key={`${selectedMetric}-${dateRange}`} // Force complete re-render when context changes
						option={chartOption}
						style={{ height: '500px', width: '100%' }}
						notMerge={true} // Ensure clean state updates without merging old options
					/>
				)}
			</CardContent>
		</Card>
	);
}
