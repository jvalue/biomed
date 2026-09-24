import { Module } from '@nestjs/common';
import { AbilityFactory } from '../auth/ability-factory';
import { AuthModule } from '../auth/auth.module';
import { KubernetesClientModule } from '../kubernetes-client/kubernetes-client.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
	imports: [KubernetesClientModule, AuthModule],
	controllers: [ServicesController],
	providers: [ServicesService, AbilityFactory],
	exports: [ServicesService],
})
export class ServicesModule {}
