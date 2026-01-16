import { Transform, Type } from 'class-transformer';
import { ArgoMetadataDto } from './argo-metadata.dto';

export class ArgoCursorPaginatedListDto<T> {
	/*Items of the paginated Response*/
	@Transform(({ value }) => value ?? [])
	items!: T[];

	/*Metadata of the paginated Response*/
	@Type(() => ArgoMetadataDto)
	metadata!: ArgoMetadataDto;
}
