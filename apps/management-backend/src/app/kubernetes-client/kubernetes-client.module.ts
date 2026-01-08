import { Module } from '@nestjs/common';
import { KubernetesAuthModule } from './auth/kubernetes-auth.module';
import { KubernetesClientService } from './kubernetes-client.service';

@Module({
	imports: [KubernetesAuthModule],
	controllers: [],
	providers: [KubernetesClientService],
	exports: [KubernetesClientService],
})
export class KubernetesClientModule {}
