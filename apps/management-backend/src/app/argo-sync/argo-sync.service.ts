import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { SchedulesService } from '../schedules/schedules.service';

@Injectable()
export class ArgoSyncService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(ArgoSyncService.name);
	private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
	private readonly enabled: boolean;
	private syncTimer?: NodeJS.Timeout;
	// Guard to avoid overlapping sync runs
	private syncInProgress = false;

	constructor(
		configService: ConfigService,
		private readonly argoClientService: ArgoClientService,
		private readonly schedulesService: SchedulesService,
	) {
		this.enabled = configService.get<boolean>('ORCHESTRATOR_SYNC_ENABLED', false);
	}

	async onModuleInit(): Promise<void> {
		this.logger.log('Starting ArgoSyncService');
		if (!this.enabled) {
			this.logger.log('ArgoSyncService is disabled via ARGO_SYNC_ENABLED=false');
			return;
		}
		this.logger.log('Starting ArgoSyncService timers');
		this.syncTimer = setInterval(() => void this.syncCronWorkflows(), this.SYNC_INTERVAL);
		// run immediately once
		void this.syncCronWorkflows();
	}

	async onModuleDestroy(): Promise<void> {
		this.logger.log('Stopping ArgoSyncService timers');
		if (this.syncTimer) clearInterval(this.syncTimer);
	}

	/**
	 * Get all cron Workflows from Argo and send them to the SchedulesService to update the schedules table if needed
	 */
	async syncCronWorkflows(): Promise<void> {
		this.logger.log('Starting Argo CronWorkflows sync job');
		// Prevent overlapping runs: skip if a sync is already in progress
		if (this.syncInProgress) {
			this.logger.warn('Previous Argo sync still running, skipping this scheduled sync');
			return;
		}
		this.syncInProgress = true;
		try {
			const scheduleDtos = await this.argoClientService.listSchedules();
			await this.schedulesService.syncSchedulesFromOrchestrator(scheduleDtos);
			this.logger.log('Finished Argo CronWorkflows sync job');
		} catch (err) {
			const errMsg = err instanceof Error ? (err.stack ?? err.message) : String(err);
			this.logger.error(`Error during Argo CronWorkflows sync job: ${errMsg}`);
		} finally {
			this.syncInProgress = false;
		}
	}
}
