import { Module } from '@nestjs/common';
import { AbilityFactory } from '../auth/ability-factory';
import { ArgoClientModule } from '../orchestrator-client/argo-client/argo-client.module';
import { CrawlerTemplatesController } from './crawler-templates.controller';
import { CrawlerTemplatesService } from './crawler-templates.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [CrawlerTemplatesController],
	providers: [CrawlerTemplatesService, AbilityFactory],
})
export class CrawlerTemplatesModule {}
