import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { HealthCheckDto } from './dto/healthCheck.dto';
import { HealthService } from './health.service';

@Controller('health')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthController {
	constructor(private readonly healthService: HealthService) {}

	@ApiOperation({ summary: 'Get the health status of the application' })
	@ApiOkResponse({ type: HealthCheckDto, description: 'Health status of the application' })
	@Get()
	async getHealthStatus(): Promise<HealthCheckDto> {
		return this.healthService.checkHealth();
	}
}
