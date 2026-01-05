import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SystemHealthDto } from './dto/systemHealth.dto';
import { TargetUrlStatusDto } from './dto/targetUrlStatus.dto';
import { HealthService } from './health.service';

@Controller('health')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthController {
	constructor(private readonly healthService: HealthService) {}

	@ApiOperation({ summary: 'Get the health status of all target services' })
	@ApiOkResponse({
		description: 'Health status of target services retrieved successfully',
		type: [TargetUrlStatusDto],
	})
	@Get('targets')
	async getTargetHealthStatus(): Promise<TargetUrlStatusDto[]> {
		return this.healthService.getTargetsHealth();
	}

	@ApiOperation({ summary: 'Get the overall system health status' })
	@ApiOkResponse({
		description: 'Overall system health status retrieved successfully',
		type: SystemHealthDto,
	})
	@Get('system')
	async getSystemHealthStatus(): Promise<SystemHealthDto> {
		return this.healthService.getSystemHealth();
	}
}
