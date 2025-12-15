import { IsString } from 'class-validator';

export class ArgoMetadataDto {
	@IsString()
	resourceVersion!: string;
}
