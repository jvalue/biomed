import { useNavigate } from '@tanstack/react-router';
import { formatDurationSeconds } from '@/src/app/utils/formatDuration';
import { Card, CardDescription, CardHeader, CardTitle } from '../design-components/card';

interface RunInfoCardsProps {
	namespace: string;
	crawlerTemplateName?: string;
	scheduleName?: string;
	startedAt?: Date;
	finishedAt?: Date;
}

export function RunInfoCardsComponent({
	namespace,
	crawlerTemplateName,
	scheduleName,
	startedAt,
	finishedAt,
}: RunInfoCardsProps) {
	const navigate = useNavigate();

	const duration =
		finishedAt && startedAt
			? Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000)
			: null;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<Card className="shadow-sm">
				<CardHeader className="pb-3">
					<CardDescription className="text-xs uppercase tracking-wide">
						Crawler Template
					</CardDescription>
					<CardTitle className="text-primary text-xl">{crawlerTemplateName ?? '-'}</CardTitle>
				</CardHeader>
			</Card>

			{scheduleName && (
				<Card
					className="shadow-sm cursor-pointer"
					onClick={() =>
						navigate({
							to: '/schedules/$scheduleNamespace/$scheduleName',
							params: { scheduleNamespace: namespace, scheduleName: scheduleName },
						})
					}
				>
					<CardHeader className="pb-3">
						<CardDescription className="text-xs uppercase tracking-wide">Schedule</CardDescription>
						<CardTitle className="text-primary text-xl">{scheduleName}</CardTitle>
					</CardHeader>
				</Card>
			)}

			<Card className="shadow-sm col-span-2">
				<CardHeader className="pb-3">
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="flex-1">
							<CardDescription className="text-xs uppercase tracking-wide">
								Started At
							</CardDescription>
							<CardTitle className="text-xl">
								{startedAt ? new Date(startedAt).toLocaleString() : 'Not yet started'}
							</CardTitle>
						</div>

						<div className="flex-1">
							<CardDescription className="text-xs uppercase tracking-wide">
								Finished At
							</CardDescription>
							<CardTitle className="text-xl font-semibold">
								{finishedAt ? new Date(finishedAt).toLocaleString() : 'Not finished yet'}
							</CardTitle>
						</div>

						{duration !== null && (
							<div className="flex-1">
								<CardDescription className="text-xs uppercase tracking-wide">
									Duration
								</CardDescription>
								<CardTitle className="text-xl font-semibold">
									{formatDurationSeconds(duration)}
								</CardTitle>
							</div>
						)}
					</div>
				</CardHeader>
			</Card>
		</div>
	);
}
