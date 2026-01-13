import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ArgoMetadataDto {
	@IsString()
	resourceVersion!: string;

	/*
	 * If present, continue indicates that more results are available.
	 * */
	@IsNumber()
	@IsOptional()
	continue?: number;
}
