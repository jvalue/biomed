import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServicePodDto {
	@ApiProperty({ description: 'Name of the pod', example: 'xml-ingestor-799d547b74-2xk8m' })
	name: string;

	@ApiProperty({ description: 'Pod phase / status', example: 'Running' })
	status: string;

	@ApiProperty({ description: 'Node on which pod is scheduled', example: 'minikube' })
	nodeName: string;

	@ApiProperty({ description: 'Restart count across containers in pod', example: 0 })
	restartCount: number;

	@ApiPropertyOptional({
		description: 'Timestamp when pod was started',
		example: '2026-08-24T10:00:00Z',
	})
	startedAt?: string;
}
