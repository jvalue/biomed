import { describe, expect, it } from 'vitest';
import { ArgoQueryParamBuilder } from './argo-query-param-builder';

describe('ArgoQueryParamBuilder', () => {
	it('returns empty string when no params added', () => {
		const b = new ArgoQueryParamBuilder();
		expect(b.build()).toBe('');
	});

	it('adds a single param', () => {
		const b = new ArgoQueryParamBuilder().add('foo', 'bar');
		expect(b.build()).toBe('?foo=bar');
	});

	it('handles undefined and null (ignored) and empty string (kept as empty value)', () => {
		const b = new ArgoQueryParamBuilder();
		b.add('a', undefined);
		b.add('b', null);
		b.add('c', '');
		expect(b.build()).toBe('?c=');
	});

	it('appends multiple values for the same key (array + scalar)', () => {
		const b = new ArgoQueryParamBuilder();
		b.add('k', 'v1').add('k', ['v2', 'v3']);
		expect(b.build()).toBe('?k=v1,v2,v3');
	});

	it('adds single label selector', () => {
		const b = new ArgoQueryParamBuilder();
		b.addLabelSelector('app', 'myapp');
		expect(b.build()).toBe('?listOptions.labelSelector=app=myapp');
	});

	it('adds array label selector using "in" syntax', () => {
		const b = new ArgoQueryParamBuilder();
		b.addLabelSelector('env', ['stg', 'prod']);
		expect(b.build()).toBe('?listOptions.labelSelector=env in (stg,prod)');
	});

	it('combines multiple label selectors into the same param', () => {
		const b = new ArgoQueryParamBuilder();
		b.addLabelSelector('app', 'myapp');
		b.addLabelSelector('env', ['stg', 'prod']);
		// values are joined with commas by the builder
		expect(b.build()).toBe('?listOptions.labelSelector=app=myapp,env in (stg,prod)');
	});

	it('preserves slashes and equals by replacing encoded characters back', () => {
		const b = new ArgoQueryParamBuilder();
		b.add('path', 'a/b').add('eq', 'a=b');
		expect(b.build()).toBe('?path=a/b&eq=a=b');
	});

	it('encodes and then normalizes parentheses and spaces for label selectors', () => {
		const b = new ArgoQueryParamBuilder();
		b.addLabelSelector('role', ['read', 'write']);
		// expects parentheses and space to be preserved after normalization
		expect(b.build()).toBe('?listOptions.labelSelector=role in (read,write)');
	});
});
