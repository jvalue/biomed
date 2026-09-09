import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePodDto } from './service-pod.dto';

export enum ServiceTypeEnum {
	XML_INGESTOR = 'xml_ingestor',
	MCP = 'mcp',
	DOWNLOADER = 'downloader',
	GENERAL = 'general',
}

export enum ServiceStatusEnum {
	RUNNING = 'Running',
	PENDING = 'Pending',
	STOPPED = 'Stopped',
	FAILED = 'Failed',
	UNKNOWN = 'Unknown',
}

export class ServiceDto {
	@ApiProperty({ description: 'Name of the service / application', example: 'xml-ingestor' })
	name: string;

	@ApiProperty({ description: 'Namespace where service resides', example: 'crawler-management' })
	namespace: string;

	@ApiProperty({
		enum: ServiceTypeEnum,
		description: 'Categorization of service type',
		example: ServiceTypeEnum.XML_INGESTOR,
	})
	serviceType: ServiceTypeEnum | string;

	@ApiProperty({
		enum: ServiceStatusEnum,
		description: 'Current status of the service',
		example: ServiceStatusEnum.RUNNING,
	})
	status: ServiceStatusEnum | string;

	@ApiProperty({ description: 'Target replica count', example: 1 })
	replicas: number;

	@ApiProperty({ description: 'Number of currently ready / available replicas', example: 1 })
	availableReplicas: number;

	@ApiPropertyOptional({
		description: 'Creation / launch timestamp',
		example: '2026-08-24T08:00:00Z',
	})
	creationTimestamp?: string;

	@ApiPropertyOptional({
		description: 'Primary container image',
		example: 'biomed/xml_ingestor:latest',
	})
	containerImage?: string;

	@ApiPropertyOptional({
		description: 'Service description or summary',
		example: 'XSD/XML to Postgres Ingestor',
	})
	description?: string;

	@ApiProperty({ type: [ServicePodDto], description: 'List of active pods for this service' })
	pods: ServicePodDto[];

	@ApiPropertyOptional({ description: 'Labels attached to the service resource' })
	labels?: Record<string, string>;
}
