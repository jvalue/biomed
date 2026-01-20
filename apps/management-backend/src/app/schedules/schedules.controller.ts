import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import {
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CrawlerRunMetricsService } from '../metrics/crawler-run-metrics/crawler-run-metrics.service';
import { UserEntity } from '../users/entity/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { HistoricalMetricsQueryDto } from './dto/historical-metrics-query.dto';
import { ScheduleDto } from './dto/schedule.dto';
import { ScheduleHistoricalMetricsItemDto } from './dto/schedule-historical-metrics-item.dto';
import { ScheduleOverallMetricsDto } from './dto/schedule-overall-metrics.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SchedulesController {
	constructor(
		private readonly schedulesService: SchedulesService,
		private readonly crawlerRunMetricsService: CrawlerRunMetricsService,
	) {}

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

	@ApiOperation({ summary: 'Delete a Schedule' })
	@ApiOkResponse({ description: 'The Schedule has been deleted' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to delete schedules',
	})
	@RequirePermission('delete', 'schedule')
	@ApiParam({ name: 'namespace', description: 'The namespace of the Schedule' })
	@ApiParam({ name: 'name', description: 'The name of the Schedule' })
	@Delete(':namespace/:name')
	async deleteSchedule(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<void> {
		return this.schedulesService.deleteSchedule(name, namespace);
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

	@ApiOperation({ summary: 'Check if a Schedule name already exists in a namespace' })
	@ApiOkResponse({ description: 'Returns true if the Schedule name exists, false otherwise' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to access schedules',
	})
	@RequirePermission('read', 'schedule')
	@ApiParam({ name: 'namespace', description: 'The namespace to check' })
	@ApiParam({ name: 'name', description: 'The Schedule name to check' })
	@Get(':namespace/:name/exists')
	async scheduleNameAlreadyExists(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<boolean> {
		const schedule = await this.schedulesService.getScheduleByNameAndNamespace(name, namespace);
		return !!schedule;
	}

	@ApiOperation({ summary: 'Get historical metrics (time series) for a Schedule' })
	@ApiOkResponse({
		type: [ScheduleHistoricalMetricsItemDto],
		description: 'Historical metrics list',
	})
	@ApiForbiddenResponse({ description: 'You do not have permission to access schedule metrics' })
	@RequirePermission('read', 'schedule')
	@ApiParam({ name: 'namespace', description: 'The namespace of the Schedule' })
	@ApiParam({ name: 'name', description: 'The name of the Schedule' })
	@Get(':namespace/:name/metrics/history')
	async getScheduleHistoricalMetrics(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
		@Query() query: HistoricalMetricsQueryDto,
	): Promise<ScheduleHistoricalMetricsItemDto[]> {
		return this.crawlerRunMetricsService.getHistoricalScheduleMetrics(name, namespace, query);
	}

	@ApiOperation({ summary: 'Get overall metrics for a Schedule (all time)' })
	@ApiOkResponse({ type: ScheduleOverallMetricsDto, description: 'Aggregated overall metrics' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access schedule metrics' })
	@RequirePermission('read', 'schedule')
	@ApiParam({ name: 'namespace', description: 'The namespace of the Schedule' })
	@ApiParam({ name: 'name', description: 'The name of the Schedule' })
	@Get(':namespace/:name/metrics/aggregated')
	async getScheduleOverallMetrics(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<ScheduleOverallMetricsDto> {
		return this.crawlerRunMetricsService.getOverallScheduleMetrics(name, namespace);
	}
}
