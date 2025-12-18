import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { WorkflowRunsController } from './workflow-runs.controller';
import { WorkflowRunsService } from './workflow-runs.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [WorkflowRunsController],
	providers: [WorkflowRunsService, AbilityFactory],
})
export class WorkflowRunsModule {}
