import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getErrorMessage } from './error-utils.ts';

describe('getErrorMessage', () => {
	it('returns Error.message when error is an Error instance', () => {
		assert.equal(getErrorMessage(new Error('network down')), 'network down');
	});

	it('returns the string when error is a non-empty string', () => {
		assert.equal(getErrorMessage('timeout'), 'timeout');
	});

	it('falls back for unknown values', () => {
		assert.equal(getErrorMessage(null), 'Có lỗi xảy ra');
		assert.equal(getErrorMessage(42, 'Không lưu được'), 'Không lưu được');
	});
});
