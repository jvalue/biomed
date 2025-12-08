import { IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class ArgoMetadataDto {
	@Expose()
	@IsString()
	resourceVersion!: string;
}
