import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkflowPhaseEnum } from '../../argo-client/enums/workflow-phase.enum';

export class WorkflowRunFilterDto {
	@ApiProperty({ type: String, required: false, description: 'Kubernetes Namespace' })
	@IsOptional()
	@IsString()
	namespace?: string;

	@ApiProperty({ type: String, required: false, description: 'Workflow template name' })
	@IsOptional()
	@IsString()
	workflowTemplateName?: string;

	@ApiProperty({
		enum: WorkflowPhaseEnum,
		enumName: 'WorkflowPhaseEnum',
		isArray: true,
		required: false,
		description: 'Filter by workflow phases',
	})
	@IsOptional()
	@IsArray()
	@IsEnum(WorkflowPhaseEnum, { each: true })
	@Transform(({ value }) => {
		if (value === undefined || value === null) return undefined;
		const arr = Array.isArray(value)
			? value
			: String(value)
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
		return arr.map((v) => {
			const match = Object.values(WorkflowPhaseEnum).find(
				(e) => String(e).toLowerCase() === String(v).toLowerCase(),
			);
			return match ?? v;
		});
	})
	phases?: WorkflowPhaseEnum[];

	@ApiProperty({ type: String, format: 'date-time', required: false })
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	createdAfter?: Date;

	@ApiProperty({ type: String, format: 'date-time', required: false })
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	finishedBefore?: Date;
}
