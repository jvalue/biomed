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

export interface ServicePodDto {
	name: string;
	status: string;
	nodeName: string;
	restartCount: number;
	startedAt?: string;
}

export interface ServiceDto {
	name: string;
	namespace: string;
	serviceType: ServiceTypeEnum | string;
	status: ServiceStatusEnum | string;
	replicas: number;
	availableReplicas: number;
	creationTimestamp?: string;
	containerImage?: string;
	description?: string;
	pods: ServicePodDto[];
	labels?: Record<string, string>;
}

export interface ServiceFilterParams {
	namespace?: string;
	serviceType?: string;
	status?: string;
	search?: string;
}
