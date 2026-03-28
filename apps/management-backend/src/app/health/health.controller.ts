import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserEntity } from '../users/entity/user.entity';
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
	@RequirePermission('read', 'health')
	@RequirePermission('read', 'schedule')
	@Get('targets')
	async getTargetHealthStatus(@CurrentUser() user: UserEntity): Promise<TargetUrlStatusDto[]> {
		return this.healthService.getTargetsHealth(user);
	}

	@Get('targets/schedules/:namespace/:name')
	@RequirePermission('read', 'health')
	async getTargetHealthForSchedule(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
		@CurrentUser() user: UserEntity,
	): Promise<TargetUrlStatusDto[]> {
		return this.healthService.getTargetsHealthForSchedule(namespace, name, user);
	}

	@ApiOperation({ summary: 'Get the overall system health status' })
	@ApiOkResponse({
		description: 'Overall system health status retrieved successfully',
		type: SystemHealthDto,
	})
	@RequirePermission('read', 'health')
	@Get('system')
	async getSystemHealthStatus(): Promise<SystemHealthDto> {
		return this.healthService.getSystemHealth();
	}
}
