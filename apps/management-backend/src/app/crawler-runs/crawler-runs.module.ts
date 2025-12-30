import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { CrawlerRunsController } from './crawler-runs.controller';
import { CrawlerRunsService } from './crawler-runs.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [CrawlerRunsController],
	providers: [CrawlerRunsService, AbilityFactory],
})
export class CrawlerRunsModule {}
