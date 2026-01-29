import { CrawlerRunEventDto } from '@/src/app/api/dto/crawler-runs/metrics/crawler-run-event.dto';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../design-components/card';
import { Spinner } from '../design-components/spinner';
import { getEventTypeClass } from './utils/get-event-type-class';

interface RunEventsSectionProps {
	events?: CrawlerRunEventDto[];
	isLoading: boolean;
	error: Error | null;
}

export function RunEventsSectionComponent({ events, isLoading, error }: RunEventsSectionProps) {
	if (isLoading) {
		return (
			<Card className="shadow-lg">
				<CardHeader className="border-b">
					<CardTitle className="text-xl">Events</CardTitle>
					<CardDescription>Timeline of events during this run</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<div className="flex justify-center py-8">
						<Spinner className="size-8" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error || !events || events.length === 0) {
		return (
			<Card className="shadow-lg">
				<CardHeader className="border-b">
					<CardTitle className="text-xl">Events</CardTitle>
					<CardDescription>Timeline of events during this run</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<p className="text-sm text-muted-foreground py-4">No events available</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="shadow-lg">
			<CardHeader className="border-b">
				<CardTitle className="text-xl">Events</CardTitle>
				<CardDescription>Timeline of events during this run</CardDescription>
			</CardHeader>
			<CardContent className="pt-6">
				<div className="space-y-3">
					{events.map((event, index) => (
						<div
							key={`${index}-${event.type}-${new Date(event.timestamp).getTime()}`}
							className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
						>
							<div className="flex items-start justify-between mb-2">
								<span
									className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getEventTypeClass(
										event.type,
									)}`}
								>
									{event.type}
								</span>
								<span className="text-xs text-muted-foreground">
									{new Date(event.timestamp).toLocaleString()}
								</span>
							</div>
							<p className="text-sm text-gray-700">{event.message}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
