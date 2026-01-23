import { IsString } from 'class-validator';

export class ArgoParameterDto {
	@IsString()
	name!: string;

	@IsString()
	value!: string;
}
