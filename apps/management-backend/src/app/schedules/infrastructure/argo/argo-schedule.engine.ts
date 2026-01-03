import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
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
	private readonly logger = new Logger(ArgoScheduleEngine.name);

	async createSchedule(dto: CreateScheduleDto, user: UserEntity): Promise<string> {
		this.logger.log(`Building Argo CronWorkflow for ${dto.name}`);

		let workflowObject: ArgoCronWorkflow;

		// Use the builder to create the CronWorkflow object
		const builder = new ArgoCronWorkflowBuilder();
		try {
			workflowObject = builder
				.setName(dto.name)
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

		// Generate YAML from the object
		const yamlString = yaml.dump(workflowObject);

		this.logger.debug('Generated YAML:', yamlString);

		// Create a pull request with the generated YAML
		return this.createPullRequest(dto.name, yamlString);
	}

	async createPullRequest(filename: string, content: string): Promise<string> {
		this.logger.log(content);
		// TODO: Create a PR in the Git repository with the given filename and content
		// Create a new branch
		// Commit the YAML file
		// Open PR and return the link
		this.logger.log(`Mock: PR created for ${filename}.yaml`);
		return `http://mock-repo/pull-requests/${filename}`;
	}
}
