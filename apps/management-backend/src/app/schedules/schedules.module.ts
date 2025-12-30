import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [SchedulesController],
	providers: [SchedulesService, AbilityFactory],
})
export class SchedulesModule {}
