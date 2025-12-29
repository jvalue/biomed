import { Module } from '@nestjs/common';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { AbilityFactory } from '../auth/ability-factory';
import { CrawlerTemplatesController } from './crawler-templates.controller';
import { CrawlerTemplatesService } from './crawler-templates.service';

@Module({
	imports: [ArgoClientModule],
	controllers: [CrawlerTemplatesController],
	providers: [CrawlerTemplatesService, AbilityFactory],
})
export class CrawlerTemplatesModule {}
