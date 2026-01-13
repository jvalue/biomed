import { Module } from '@nestjs/common';
import { AbilityFactory } from '../auth/ability-factory';
import { ArgoClientModule } from '../orchestrator-client/argo-client/argo-client.module';
import { CrawlerRunsController } from './crawler-runs.controller';
import { CrawlerRunsService } from './crawler-runs.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [CrawlerRunsController],
	providers: [CrawlerRunsService, AbilityFactory],
})
export class CrawlerRunsModule {}
