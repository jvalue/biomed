import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
	@ApiCreatedResponse({ description: 'The Schedule has been created' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to create schedules',
	})
	@RequirePermission('create', 'schedule')
	@Post()
	async createSchedule(
		@CurrentUser() user: UserEntity,
		@Body() body: CreateScheduleDto,
	): Promise<void> {
		return this.schedulesService.createSchedule(body, user);
	}

	@ApiOperation({ summary: 'Suspend a Schedule' })
	@ApiOkResponse({ description: 'The Schedule has been suspended' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to update schedules',
	})
	@RequirePermission('update', 'schedule')
	@ApiParam({ name: 'namespace', description: 'The namespace of the Schedule' })
	@ApiParam({ name: 'name', description: 'The name of the Schedule' })
	@Patch(':namespace/:name/suspend')
	async suspendSchedule(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<void> {
		return this.schedulesService.suspendSchedule(name, namespace);
	}

	@ApiOperation({ summary: 'Resume a Schedule' })
	@ApiOkResponse({ description: 'The Schedule has been resumed' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to update schedules',
	})
	@RequirePermission('update', 'schedule')
	@ApiParam({ name: 'namespace', description: 'The namespace of the Schedule' })
	@ApiParam({ name: 'name', description: 'The name of the Schedule' })
	@Patch(':namespace/:name/resume')
	async resumeSchedule(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<void> {
		return this.schedulesService.resumeSchedule(name, namespace);
	}
}
