/**
 * Mapper functions for argo
 */
import { WorkflowRunDto } from '../../workflow-runs/dto/workflow-run.dto';
import { ArgoWorkflowRunDto } from '../dto/workflow-runs/argo-workflow-run.dto';

export function mapArgoWorkflowRunDtotoWorkflowRunDto(run: ArgoWorkflowRunDto): WorkflowRunDto {
	const workflowRun = new WorkflowRunDto();
	workflowRun.name = run.metadata.name;
	workflowRun.namespace = run.metadata.namespace;
	workflowRun.workflowTemplateName = run.spec.workflowTemplateRef.name;
	workflowRun.phase = run.status.phase;
	workflowRun.startedAt = run.status.startedAt;
	workflowRun.finishedAt = run.status.finishedAt;
	return workflowRun;
}
