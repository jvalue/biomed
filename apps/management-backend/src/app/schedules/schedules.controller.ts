import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ScheduleDto } from './dto/schedule.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SchedulesController {
	constructor(private readonly schedulesService: SchedulesService) {}

	@ApiOperation({ summary: 'List all Schedules' })
	@ApiOkResponse({ type: [ScheduleDto], description: 'List of Schedules' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to access schedules or templates',
	})
	@RequirePermission('read', 'schedule')
	@RequirePermission('read', 'crawler-template')
	@Get()
	async listSchedules(): Promise<ScheduleDto[]> {
		return this.schedulesService.listSchedules();
	}

	@ApiOperation({ summary: 'Get a Schedule by name and namespace' })
	@ApiOkResponse({ type: ScheduleDto, description: 'The Schedule' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to access schedules or templates',
	})
	@RequirePermission('read', 'schedule')
	@RequirePermission('read', 'crawler-template')
	@ApiParam({ name: 'namespace', description: 'The namespace of the Schedule' })
	@ApiParam({ name: 'name', description: 'The name of the Schedule' })
	@Get(':namespace/:name')
	async getScheduleByNameAndNamespace(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<ScheduleDto> {
		return this.schedulesService.getScheduleByNameAndNamespace(name, namespace);
	}
}
