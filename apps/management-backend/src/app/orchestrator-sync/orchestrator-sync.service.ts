import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawlerTemplateDto } from '../crawler-templates/dto/crawler-template.dto';
import { ArgoClientService } from '../orchestrator-client/argo-client/argo-client.service';
import { ScheduleDto } from '../schedules/dto/schedule.dto';
import { ScheduleEntity } from '../schedules/entity/schedule.entity';
import { ScheduleErrorType } from '../schedules/enums/schedule-error-type.enum';
import { SchedulesService } from '../schedules/schedules.service';

@Injectable()
export class OrchestratorSyncService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(OrchestratorSyncService.name);
	private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
	private readonly SCHEDULE_TEMPLATE_VALIDATION_INTERVAL = 10 * 60 * 1000; // 10 minutes
	private readonly enabled: boolean;
	private syncTimer?: NodeJS.Timeout;
	private templateCheckTimer?: NodeJS.Timeout;
	// Guard to avoid overlapping sync runs
	private syncInProgress = false;
	private checkInProgress = false;

	constructor(
		configService: ConfigService,
		private readonly orchestratorClientService: ArgoClientService,
		private readonly schedulesService: SchedulesService,
	) {
		this.enabled = configService.get<boolean>('ORCHESTRATOR_SYNC_ENABLED', false);
	}

	async onModuleInit(): Promise<void> {
		this.logger.log('Starting OrchestratorSyncService');
		if (!this.enabled) {
			this.logger.log('OrchestratorSyncService is disabled via ORCHESTRATOR_SYNC_ENABLED=false');
			return;
		}
		this.logger.log('Starting OrchestratorSyncService timers');
		this.syncTimer = setInterval(() => void this.syncCronWorkflows(), this.SYNC_INTERVAL);
		this.templateCheckTimer = setInterval(
			() => void this.checkTemplates(),
			this.SCHEDULE_TEMPLATE_VALIDATION_INTERVAL,
		);
		// run immediately once
		void this.syncCronWorkflows();
		void this.checkTemplates();
	}

	async onModuleDestroy(): Promise<void> {
		this.logger.log('Stopping OrchestratorSyncService timers');
		if (this.syncTimer) clearInterval(this.syncTimer);
		if (this.templateCheckTimer) clearInterval(this.templateCheckTimer);
	}

	/**
	 * Get all schedules from Orchestrator and send them to the SchedulesService to update the schedules table if needed
	 */
	async syncCronWorkflows(): Promise<void> {
		this.logger.log('Starting Orchestrator Schedule sync job');
		// Prevent overlapping runs: skip if a sync is already in progress
		if (this.syncInProgress) {
			this.logger.warn('Previous sync still running, skipping this scheduled sync');
			return;
		}
		this.syncInProgress = true;
		try {
			const scheduleDtos = await this.orchestratorClientService.listSchedules();
			await this.schedulesService.syncSchedulesFromOrchestrator(scheduleDtos);
			this.logger.log('Finished Orchestrator Schedule sync job');
		} catch (err) {
			const errMsg = err instanceof Error ? (err.stack ?? err.message) : String(err);
			this.logger.error(`Error during Orchestrator Schedule sync job: ${errMsg}`);
		} finally {
			this.syncInProgress = false;
		}
	}

	/**
	 * Checks for all schedules if the parameters provided by the schedule differ from the parameters expected by the referenced WorkflowTemplate.
	 */
	async checkTemplates(): Promise<void> {
		this.logger.log('Starting Crawler Template check job');
		if (this.checkInProgress) {
			this.logger.warn(
				'Previous Crawler Template check still running, skipping this scheduled check',
			);
			return;
		}
		this.checkInProgress = true;
		try {
			const localSchedules = await this.schedulesService.getAllScheduleEntities();
			for (const localSchedule of localSchedules) {
				await this.handleScheduleTemplateCheck(localSchedule);
			}
			this.logger.log('Finished Crawler Template check job');
		} catch (err) {
			this.logger.error('Failed to check crawler templates', err);
		} finally {
			this.checkInProgress = false;
		}
	}

	// Helper: handle a single schedule's template
	async handleScheduleTemplateCheck(localSchedule: ScheduleEntity): Promise<void> {
		try {
			const templateName = localSchedule.crawlerTemplateName;
			const templateNamespace = localSchedule.namespace;

			// Lookup template
			const template = await this.orchestratorClientService.getCrawlerTemplateByNamespaceAndName(
				templateName,
				templateNamespace,
			);
			if (!template) {
				this.logger.error(
					`WorkflowTemplate ${templateName} in namespace ${templateNamespace} not found for schedule ${localSchedule.name}`,
				);
				// set error for missing template
				await this.schedulesService.addScheduleError(
					localSchedule.name,
					localSchedule.namespace,
					ScheduleErrorType.TEMPLATE_NOT_FOUND,
					{
						details: `Referenced Crawler Template ${templateName} not found in namespace ${templateNamespace}`,
						detectedAt: new Date(),
					},
				);
				return;
			}

			// If a template-not-found error existed previously, clear it now that we found the template
			await this.schedulesService.removeScheduleError(
				localSchedule.name,
				localSchedule.namespace,
				ScheduleErrorType.TEMPLATE_NOT_FOUND,
			);

			// Skip if we've already checked this template version
			if (
				localSchedule.lastCheckedTemplateVersionLabel &&
				template.templateVersion === localSchedule.lastCheckedTemplateVersionLabel
			) {
				// already checked this version
				return;
			}

			// Lookup schedule in orchestrator
			const orchestratorSchedule =
				await this.orchestratorClientService.getScheduleByNamespaceAndName(
					localSchedule.name,
					localSchedule.namespace,
				);
			if (!orchestratorSchedule) {
				// schedule not found in orchestrator, skip as it will be removed by next sync
				this.logger.warn(
					`Schedule ${localSchedule.name} in namespace ${localSchedule.namespace} not found in orchestrator during template check, skipping`,
				);
				return;
			}

			// Compare and set/remove parameter mismatch errors as needed
			await this.compareParamsAndUpdateErrors(localSchedule, template, orchestratorSchedule);

			if (template.templateVersion) {
				// Set the last checked template version label
				await this.schedulesService.setLastCheckedTemplateVersionLabel(
					localSchedule.name,
					localSchedule.namespace,
					template.templateVersion,
				);
			}
		} catch (err) {
			this.logger.error(
				`Error checking template for schedule ${localSchedule?.name ?? '<unknown>'}`,
				err,
			);
		}
	}

	/**
	 * Compare the parameters expected by the template with those provided by the schedule, and update errors accordingly
	 * @param localSchedule
	 * @param template
	 * @param orchestratorSchedule
	 */
	async compareParamsAndUpdateErrors(
		localSchedule: ScheduleEntity,
		template: CrawlerTemplateDto,
		orchestratorSchedule: ScheduleDto,
	): Promise<void> {
		// Compare parameters expected by template with params provided by schedule
		const expectedParams: string[] = template.parameters?.map((p) => p.name) ?? [];
		const providedParamNames: string[] = orchestratorSchedule.parameters?.map((p) => p.name) ?? [];

		// Find missing and extra parameters
		const missing = expectedParams.filter((p) => !providedParamNames.includes(p));
		const extra = providedParamNames.filter((p) => !expectedParams.includes(p));

		// If there are no differences, remove any existing PARAMETER_MISMATCH error
		if (missing.length === 0 && extra.length === 0) {
			await this.schedulesService.removeScheduleError(
				localSchedule.name,
				localSchedule.namespace,
				ScheduleErrorType.PARAMETER_MISMATCH,
			);
			return;
		}

		// Build a combined error message when there are mismatches
		const parts: string[] = [];
		if (missing.length > 0) {
			parts.push(`Missing parameters expected by the crawler template: ${missing.join(', ')}`);
		}
		if (extra.length > 0) {
			parts.push(
				`Extra parameters defined in the schedule not expected by the crawler template: ${extra.join(', ')}`,
			);
		}

		const details = parts.join('; ');
		await this.schedulesService.addScheduleError(
			localSchedule.name,
			localSchedule.namespace,
			ScheduleErrorType.PARAMETER_MISMATCH,
			{
				details,
				detectedAt: new Date(),
			},
		);
	}
}
