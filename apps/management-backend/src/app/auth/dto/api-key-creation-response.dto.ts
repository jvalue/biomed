export class ApiKeyCreationResponseDto {
	id: string;
	prefix: string;
	/**
	 * The raw API key. This value is only available once and MUST NOT be logged or stored.
	 * Show it to the user immediately and discard it from memory.
	 */
	rawKey: string;
}
