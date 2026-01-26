import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { ArgoClientService } from '../../../orchestrator-client/argo-client/argo-client.service';
import { UserEntity } from '../../../users/entity/user.entity';
import { CreateScheduleDto } from '../../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../../dto/update-schedule.dto';
import { IScheduleEngine } from '../../schedule-engine.interface';
import { ArgoCronWorkflow } from './argo-cron-workflow';
import { ArgoCronWorkflowBuilder } from './argo-cron-workflow.builder';

/**
 * Schedule engine implementation for Argo Workflows
 */
@Injectable()
export class ArgoScheduleEngine implements IScheduleEngine {
	constructor(private readonly argoClientService: ArgoClientService) {}
	private readonly logger = new Logger(ArgoScheduleEngine.name);

	async createSchedule(dto: CreateScheduleDto, user: UserEntity): Promise<void> {
		this.logger.log(`Building Argo CronWorkflow for ${dto.name}`);

		let workflowObject: ArgoCronWorkflow;

		// Use the builder to create the CronWorkflow object
		const builder = new ArgoCronWorkflowBuilder();
		try {
			workflowObject = builder
				.setName(dto.name)
				.setNamespace(dto.crawlerTemplateNamespace)
				.setSchedule(dto.cronExpression)
				.setTemplateRef(dto.crawlerTemplateName)
				.addParameters(dto.parameters)
				.addLabel('created-by', user.id)
				.addLabel('created-by-fallback', user.username)
				.addRetryStrategy(dto.retryStrategy)
				.build();
		} catch (error) {
			throw new BadRequestException(`Failed to create schedule: ${error.message}`);
		}

		// Generate YAML from the object for debug reasons
		const yamlString = yaml.dump(workflowObject);

		this.logger.debug('Generated YAML:', yamlString);

		// Send the YAML to Argo Workflows API
		await this.argoClientService.createSchedule(workflowObject, dto.crawlerTemplateNamespace);
	}

	/**
	 * Updates a schedule in Argo Workflows
	 * @param name The name of the schedule
	 * @param namespace The namespace of the schedule
	 * @param updateScheduleDto The updated schedule data
	 */
	async updateSchedule(
		name: string,
		namespace: string,
		updateScheduleDto: UpdateScheduleDto,
	): Promise<void> {
		const existingWorkflow = await this.argoClientService.getCronWorkflow(name, namespace);
		if (!existingWorkflow) {
			throw new NotFoundException(`Schedule ${name} in namespace ${namespace} not found`);
		}

		// Update cron expression
		if (updateScheduleDto.cronExpression) {
			existingWorkflow.spec.schedules = [updateScheduleDto.cronExpression];
		}

		// Update retry strategy
		if (updateScheduleDto.retryStrategy) {
			const retry = updateScheduleDto.retryStrategy;
			existingWorkflow.spec.workflowSpec.retryStrategy = {
				limit: retry.retries,
				backoff: {
					duration: retry.backoffDuration,
					factor: retry.backoffFactor,
					maxDuration: retry.backoffMaxDuration,
				},
			};
		}
		// Generate YAML from the object for debug reasons
		const yamlString = yaml.dump(existingWorkflow);

		this.logger.debug('Generated YAML:', yamlString);

		await this.argoClientService.updateCronWorkflow(name, namespace, existingWorkflow);
	}
}
