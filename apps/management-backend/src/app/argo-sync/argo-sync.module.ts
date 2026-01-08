import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { ArgoSyncService } from './argo-sync.service';

@Module({
	imports: [ArgoClientModule, SchedulesModule],
	controllers: [],
	providers: [ArgoSyncService],
	exports: [],
})
export class ArgoSyncModule {}
