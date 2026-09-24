import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ServiceStatusEnum, ServiceTypeEnum } from './service.dto';

export class ServiceFilterDto {
	@ApiPropertyOptional({ description: 'Filter by namespace' })
	@IsOptional()
	@IsString()
	namespace?: string;

	@ApiPropertyOptional({ enum: ServiceTypeEnum, description: 'Filter by service type' })
	@IsOptional()
	@IsString()
	serviceType?: string;

	@ApiPropertyOptional({ enum: ServiceStatusEnum, description: 'Filter by service status' })
	@IsOptional()
	@IsString()
	status?: string;

	@ApiPropertyOptional({ description: 'Search term for service name or description' })
	@IsOptional()
	@IsString()
	search?: string;
}
