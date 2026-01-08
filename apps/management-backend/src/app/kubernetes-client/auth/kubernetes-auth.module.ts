import { Module } from '@nestjs/common';
import { KubernetesAuthService } from './kubernetes-auth.service';

@Module({
	imports: [],
	controllers: [],
	providers: [KubernetesAuthService],
	exports: [KubernetesAuthService],
})
export class KubernetesAuthModule {}
