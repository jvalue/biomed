import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { WorkflowTemplatesController } from './workflow-templates.controller';
import { WorkflowTemplatesService } from './workflow-templates.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [WorkflowTemplatesController],
	providers: [WorkflowTemplatesService, AbilityFactory],
})
export class WorkflowTemplatesModule {}
