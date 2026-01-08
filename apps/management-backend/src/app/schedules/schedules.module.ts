import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { TargetsModule } from '../health/targets/targets.module';
import { ScheduleEntity } from './entity/schedule.entity';
import { ArgoScheduleEngine } from './infrastructure/argo/argo-schedule.engine';
import { SCHEDULE_ENGINE } from './schedule-engine.interface';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
	imports: [ArgoClientModule, TargetsModule, TypeOrmModule.forFeature([ScheduleEntity])],
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
	exports: [SchedulesService],
})
export class SchedulesModule {}
