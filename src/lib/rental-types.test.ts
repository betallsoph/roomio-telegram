import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	canonicalRentalType,
	parseRentalTypes,
	propertyLabel,
	rentalTypeShortLabel
} from './rental-types.ts';

describe('rental-types', () => {
	it('normalizes legacy aliases to canonical rental types', () => {
		assert.equal(canonicalRentalType('coliving'), 'APARTMENT');
		assert.equal(canonicalRentalType('SERVICED_APARTMENT'), 'MOTEL');
		assert.equal(canonicalRentalType('  dorm '), 'DORM');
	});

	it('parses comma-separated rental types with dedupe and fallback', () => {
		assert.deepEqual(parseRentalTypes('APARTMENT,MOTEL,APARTMENT'), ['APARTMENT', 'MOTEL']);
		assert.deepEqual(parseRentalTypes('COLIVING,SERVICED_APARTMENT'), ['APARTMENT', 'MOTEL']);
		assert.deepEqual(parseRentalTypes(''), ['APARTMENT']);
		assert.deepEqual(parseRentalTypes('invalid'), ['APARTMENT']);
	});

	it('returns property-specific labels for UI copy', () => {
		assert.equal(propertyLabel('MOTEL'), 'khu trọ');
		assert.equal(rentalTypeShortLabel('WHOLE_UNIT'), 'Nguyên căn');
	});
});
