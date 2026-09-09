import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ServiceDto } from './dto/service.dto';
import { ServiceFilterDto } from './dto/service-filter.dto';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServicesController {
	constructor(private readonly servicesService: ServicesService) {}

	@ApiOperation({ summary: 'List all long-running services/apps' })
	@ApiOkResponse({ type: [ServiceDto], description: 'List of long-running services' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access services' })
	@RequirePermission('read', 'service')
	@Get()
	async listServices(@Query() filter?: ServiceFilterDto): Promise<ServiceDto[]> {
		return this.servicesService.listServices(filter);
	}

	@ApiOperation({ summary: 'Get a long-running service by namespace and name' })
	@ApiOkResponse({ type: ServiceDto, description: 'Service details' })
	@ApiForbiddenResponse({ description: 'You do not have permission to access this service' })
	@ApiNotFoundResponse({ description: 'Service with given name in namespace not found' })
	@RequirePermission('read', 'service')
	@ApiParam({ name: 'namespace', description: 'Namespace of the service' })
	@ApiParam({ name: 'name', description: 'Name of the service' })
	@Get(':namespace/:name')
	async getService(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<ServiceDto> {
		return this.servicesService.getService(namespace, name);
	}

	@ApiOperation({ summary: 'Get logs for a long-running service' })
	@ApiOkResponse({ description: 'Log entries for service pods' })
	@ApiForbiddenResponse({ description: 'You do not have permission to read service logs' })
	@RequirePermission('read', 'service')
	@ApiParam({ name: 'namespace', description: 'Namespace of the service' })
	@ApiParam({ name: 'name', description: 'Name of the service' })
	@ApiQuery({
		name: 'podName',
		required: false,
		description: 'Specific pod name to fetch logs for',
	})
	@ApiQuery({ name: 'tailLines', required: false, description: 'Number of log lines to tail' })
	@Get(':namespace/:name/logs')
	async getServiceLogs(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
		@Query('podName') podName?: string,
		@Query('tailLines') tailLines?: number,
	): Promise<Array<{ podName: string; logs: string }>> {
		return this.servicesService.getServiceLogs(
			namespace,
			name,
			podName,
			tailLines ? Number(tailLines) : 100,
		);
	}

	@ApiOperation({ summary: 'Abort/stop a long-running service' })
	@ApiOkResponse({ type: ServiceDto, description: 'The aborted service details' })
	@ApiResponse({ status: 403, description: 'You do not have permission to abort services' })
	@RequirePermission('abort', 'service')
	@ApiParam({ name: 'namespace', description: 'Namespace of the service' })
	@ApiParam({ name: 'name', description: 'Name of the service' })
	@Post(':namespace/:name/abort')
	async abortService(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<ServiceDto> {
		return this.servicesService.abortService(namespace, name);
	}

	@ApiOperation({ summary: 'Restart/start a long-running service' })
	@ApiOkResponse({ type: ServiceDto, description: 'The restarted service details' })
	@ApiResponse({
		status: 403,
		description: 'You do not have permission to update/restart services',
	})
	@RequirePermission('update', 'service')
	@ApiParam({ name: 'namespace', description: 'Namespace of the service' })
	@ApiParam({ name: 'name', description: 'Name of the service' })
	@Post(':namespace/:name/restart')
	async restartService(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<ServiceDto> {
		return this.servicesService.restartService(namespace, name);
	}

	@ApiOperation({ summary: 'Delete a long-running service' })
	@ApiOkResponse({ description: 'Service deleted successfully' })
	@ApiResponse({ status: 403, description: 'You do not have permission to delete services' })
	@RequirePermission('delete', 'service')
	@ApiParam({ name: 'namespace', description: 'Namespace of the service' })
	@ApiParam({ name: 'name', description: 'Name of the service' })
	@Delete(':namespace/:name')
	async deleteService(
		@Param('namespace') namespace: string,
		@Param('name') name: string,
	): Promise<void> {
		return this.servicesService.deleteService(namespace, name);
	}
}
