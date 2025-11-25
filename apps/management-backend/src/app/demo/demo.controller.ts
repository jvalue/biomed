import { Body, Controller, Get, Post } from '@nestjs/common';
import { ArgoClientService } from '../argo-client/argo-client.service';
import { DemoService } from './demo.service';
import { DemoDto } from './dto/demo.dto';

@Controller('demo')
export class DemoController {
	constructor(
		private readonly demoService: DemoService,
		private readonly argoClientService: ArgoClientService,
	) {}

	@Get()
	getDemoData() {
		return this.demoService.getDemoData();
	}

	@Post()
	createDemoItem(@Body() body: DemoDto) {
		return this.demoService.createDemoItem(body.title);
	}

	@Get('workflows')
	async listArgoWorkflows() {
		return this.argoClientService.listWorkflows('argo-managed-crawler');
	}
}
