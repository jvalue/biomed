import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DemoService } from './demo.service';
import { DemoDto } from './dto/demo.dto';

@Controller('demo')
@UseGuards(JwtAuthGuard)
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
