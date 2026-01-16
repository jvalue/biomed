import { Module } from '@nestjs/common';
import { ArgoAuthService } from './argo-auth.service';

@Module({
	imports: [],
	controllers: [],
	providers: [ArgoAuthService],
	exports: [ArgoAuthService],
})
export class ArgoAuthModule {}
