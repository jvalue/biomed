/**
 * Utility class to build query parameters for Argo API requests following the builder desing pattern.
 */
export class ArgoQueryParamBuilder {
	private readonly params = new Map<string, string[]>();

	/**
	 * Adds a generic query parameter.
	 */
	add(key: string, value?: string | number | boolean | (string | number | boolean)[]): this {
		if (value === undefined || value === null) return this;

		// Convert value(s) to string and filter out empty strings
		const valArr = Array.isArray(value)
			? value.map(String).filter((v) => v.length > 0)
			: [String(value)];
		if (valArr.length === 0) return this;

		// Append to existing values for the same key
		const existing = this.params.get(key) ?? [];
		this.params.set(key, existing.concat(valArr));
		return this;
	}

	/**
	 * Special handling for label selectors, where multiple selectors are combined with commas and arrays use 'in' syntax.
	 * @param key
	 * @param value
	 */
	addLabelSelector(key: string, value?: string | string[]): this {
		if (!value) return this;
		const k = 'listOptions.labelSelector';
		const existing = this.params.get(k) ?? [];
		let v: string;
		if (Array.isArray(value)) {
			v = key + ' in (' + value.join(',') + ')';
		} else {
			v = key + '=' + value;
		}
		existing.push(v);
		this.params.set(k, existing);
		return this;
	}

	/**
	 * Builds final query string; returns empty string if no parameters.
	 */
	build(): string {
		if (this.params.size === 0) return '';

		const parts: string[] = [];
		for (const [key, values] of this.params) {
			if (values.length === 0) continue;
			if (values.length === 1) {
				parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(values[0])}`);
			} else {
				parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(values.join(','))}`);
			}
		}

		return (parts.length ? `?${parts.join('&')}` : '')
			.replace(/%2F/g, '/') // slash
			.replace(/%3D/g, '=') // equals
			.replace(/%2C/g, ',') // comma
			.replace(/%28/g, '(') // (
			.replace(/%29/g, ')') // )
			.replace(/%20/g, ' '); // space
	}
}
