import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [HealthController],
	providers: [HealthService, AbilityFactory],
})
export class HealthModule {}
