import { Module } from '@nestjs/common';
import { AbilityFactory } from '../auth/ability-factory';
import { KubernetesClientModule } from '../kubernetes-client/kubernetes-client.module';
import { ArgoClientModule } from '../orchestrator-client/argo-client/argo-client.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { TargetsModule } from './targets/targets.module';

@Module({
	imports: [ArgoClientModule, TargetsModule, KubernetesClientModule],
	controllers: [HealthController],
	providers: [HealthService, AbilityFactory],
})
export class HealthModule {}
