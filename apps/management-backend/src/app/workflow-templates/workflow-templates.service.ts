import { Injectable, Logger } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { CurserBasedPaginationResponseDto } from '../pagination/dto/curser-based-pagination-response.dto';
import { CurserBasedPaginationRequestDto } from '../pagination/dto/cursor-based-pagination-request.dto';
import { WorkflowTemplateDto } from './dto/workflow-template.dto';

@Injectable()
export class WorkflowTemplatesService {
	private readonly logger = new Logger(WorkflowTemplatesService.name);

	constructor(private readonly argoClientService: ArgoClientService) {}

	/**
	 * Lists all Argo Workflow Templates.
	 * @param filter Optional filtering options
	 * @param pagination Optional pagination options
	 */
	async listWorkflowTemplates(
		pagination?: CurserBasedPaginationRequestDto,
	): Promise<CurserBasedPaginationResponseDto<WorkflowTemplateDto>> {
		return this.argoClientService.listWorkflowTemplates();
	}
}
