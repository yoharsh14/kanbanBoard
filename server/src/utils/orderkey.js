import { generateKeyBetween as _generateKeyBetween } from 'fractional-indexing';

export function generateKeyBetween(before, after) {
  return _generateKeyBetween(before ?? null, after ?? null);
}

export function generateNextKey(prevKey) {
  return _generateKeyBetween(prevKey ?? null, null);
}