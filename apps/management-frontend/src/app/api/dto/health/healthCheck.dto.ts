export enum HealthStatusEnum {
	AVAILABLE = 'available',
	LIMITED = 'limited',
	DOWN = 'down',
}

export class TargetUrlStatusDto {
	url!: string;

	status!: HealthStatusEnum;
}

export class HealthCheckDto {
	overAllStatus!: HealthStatusEnum;

	kubernetesStatus!: HealthStatusEnum;

	orchestratorStatus!: HealthStatusEnum;

	targetUrlsStatus!: TargetUrlStatusDto[];
}
