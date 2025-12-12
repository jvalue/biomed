export class CurserBasedPaginationResponseDto<T> {
	// The array of items for the current page
	data!: T[];

	// Metadata about the pagination state
	metadata!: CurserBasedPaginationMetadata;
}

class CurserBasedPaginationMetadata {
	// Indicates if there is a next page of workflow runs available (so if there should be a "Next Page" button)
	hasMore!: boolean;
}
