import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../orchestrator-client/argo-client/argo-client.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { OrchestratorSyncService } from './orchestrator-sync.service';

@Module({
	imports: [ArgoClientModule, SchedulesModule],
	controllers: [],
	providers: [OrchestratorSyncService],
	exports: [],
})
export class OrchestratorSyncModule {}
