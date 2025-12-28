import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { ArgoScheduleEngine } from './infrastructure/argo/argo-schedule.engine';
import { SCHEDULE_ENGINE } from './schedule-engine.interface';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [SchedulesController],
	providers: [
		SchedulesService,
		AbilityFactory,
		{
			provide: SCHEDULE_ENGINE,
			// Here is defined which schedule engine to use
			useClass: ArgoScheduleEngine,
		},
	],
})
export class SchedulesModule {}
