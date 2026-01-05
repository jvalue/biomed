import { Info } from 'lucide-react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/src/app/components/design-components/tooltip';
import { formatDurationSeconds } from '@/src/app/utils/formatDuration';

type RetryStrategyDto = {
	retries: number;
	backoffDuration?: number | null; // in seconds
	backoffFactor?: number | null;
	backoffCap?: number | null; // in seconds
	backoffMaxDuration?: number | null; // in seconds
};

export default function ScheduleConfigurationSectionComponent({
	retryStrategy,
}: {
	retryStrategy?: RetryStrategyDto;
}) {
	return (
		<Card className="shadow-lg">
			<CardHeader className="border-b">
				<CardTitle className="text-xl">Configuration</CardTitle>
				<CardDescription>Advanced configuration settings for this schedule</CardDescription>
			</CardHeader>
			<CardContent className="pt-6 space-y-6">
				<div>
					<h3 className="text-lg font-semibold mb-4">Retry Strategy</h3>
					{retryStrategy ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="flex items-center gap-2">
								<div className="flex flex-col">
									<span className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
										Retries
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													className="p-0 m-0 focus:outline-none"
													aria-label="Retries info"
												>
													<Info className="w-4 h-4 text-muted-foreground" />
												</button>
											</TooltipTrigger>
											<TooltipContent>Number of retry attempts before giving up</TooltipContent>
										</Tooltip>
									</span>
									<span className="text-lg font-semibold">{retryStrategy.retries}</span>
								</div>
							</div>

							<div className="flex flex-col">
								<span className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
									Backoff Duration
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												className="p-0 m-0 focus:outline-none"
												aria-label="Backoff Duration info"
											>
												<Info className="w-4 h-4 text-muted-foreground" />
											</button>
										</TooltipTrigger>
										<TooltipContent>Initial wait time before retry attempts</TooltipContent>
									</Tooltip>
								</span>
								<span className="text-lg font-semibold">
									{formatDurationSeconds(retryStrategy.backoffDuration)}
								</span>
							</div>

							{retryStrategy.backoffFactor !== undefined && (
								<div className="flex flex-col">
									<span className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
										Backoff Factor
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													className="p-0 m-0 focus:outline-none"
													aria-label="Backoff Factor info"
												>
													<Info className="w-4 h-4 text-muted-foreground" />
												</button>
											</TooltipTrigger>
											<TooltipContent>
												Multiplier applied to the backoff duration for each retry attempt
											</TooltipContent>
										</Tooltip>
									</span>
									<span className="text-lg font-semibold">{retryStrategy.backoffFactor}</span>
								</div>
							)}

							{retryStrategy.backoffCap !== undefined && (
								<div className="flex flex-col">
									<span className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
										Backoff Cap
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													className="p-0 m-0 focus:outline-none"
													aria-label="Backoff Cap info"
												>
													<Info className="w-4 h-4 text-muted-foreground" />
												</button>
											</TooltipTrigger>
											<TooltipContent>
												Maximum wait time applied to a single retry attempt
											</TooltipContent>
										</Tooltip>
									</span>
									<span className="text-lg font-semibold">
										{formatDurationSeconds(retryStrategy.backoffCap)}
									</span>
								</div>
							)}

							{retryStrategy.backoffMaxDuration !== undefined && (
								<div className="flex flex-col">
									<span className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
										Backoff Max Duration
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													className="p-0 m-0 focus:outline-none"
													aria-label="Backoff Max Duration info"
												>
													<Info className="w-4 h-4 text-muted-foreground" />
												</button>
											</TooltipTrigger>
											<TooltipContent>Maximum total wait time across all retries</TooltipContent>
										</Tooltip>
									</span>
									<span className="text-lg font-semibold">
										{formatDurationSeconds(retryStrategy.backoffMaxDuration)}
									</span>
								</div>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No retry strategy configured</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
