import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { ArgoClientService } from '../../../orchestrator-client/argo-client/argo-client.service';
import { UserEntity } from '../../../users/entity/user.entity';
import { CreateScheduleDto } from '../../dto/create-schedule.dto';
import { IScheduleEngine } from '../../schedule-engine.interface';
import { ArgoCronWorkflow } from './argo-cron-workflow';
import { ArgoCronWorkflowBuilder } from './argo-cron-workflow.builder';

/**
 * Schedule engine implementation for Argo Workflows
 */
@Injectable()
export class ArgoScheduleEngine implements IScheduleEngine {
	constructor(private readonly orchestratorClientService: ArgoClientService) {}
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
		await this.orchestratorClientService.createSchedule(
			workflowObject,
			dto.crawlerTemplateNamespace,
		);
	}
}
