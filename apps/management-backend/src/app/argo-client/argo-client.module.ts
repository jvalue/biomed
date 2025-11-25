import { Module } from '@nestjs/common';
import { ArgoAuthModule } from './argo-auth/argo-auth.module';
import { ArgoClientService } from './argo-client.service';

@Module({
	imports: [ArgoAuthModule],
	controllers: [],
	providers: [ArgoClientService],
	exports: [ArgoClientService],
})
export class ArgoClientModule {}
