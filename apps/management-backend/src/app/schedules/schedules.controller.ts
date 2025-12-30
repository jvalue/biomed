import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserEntity } from '../users/entity/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
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

	@ApiOperation({ summary: 'Create a new Schedule' })
	@ApiCreatedResponse({ type: String, description: 'The link to the created PR of the schedule' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to create schedules',
	})
	@RequirePermission('create', 'schedule')
	@Post()
	async createSchedule(
		@CurrentUser() user: UserEntity,
		@Body() body: CreateScheduleDto,
	): Promise<string> {
		return this.schedulesService.createSchedule(body, user);
	}
}
