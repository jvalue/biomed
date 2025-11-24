import { Body, Controller, Get, Post } from '@nestjs/common';
import { DemoService } from './demo.service';
import { DemoDto } from './dto/demo.dto';

@Controller('demo')
export class DemoController {
	constructor(private readonly demoService: DemoService) {}

	@Get()
	getDemoData() {
		return this.demoService.getDemoData();
	}

	@Post()
	createDemoItem(@Body() body: DemoDto) {
		return this.demoService.createDemoItem(body.title);
	}
}
