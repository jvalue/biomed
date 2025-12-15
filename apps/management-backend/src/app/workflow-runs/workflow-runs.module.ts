import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { WorkflowRunsController } from './workflow-runs.controller';
import { WorkflowRunsService } from './workflow-runs.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [WorkflowRunsController],
	providers: [WorkflowRunsService],
})
export class WorkflowRunsModule {}
