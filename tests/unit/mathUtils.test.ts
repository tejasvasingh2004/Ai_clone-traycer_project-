import { describe, it, expect } from 'vitest';
import { sumArray } from '../../src/utils/mathUtils.ts';

describe('sumArray', () => {
  it('should return 0 for an empty array', () => {
    expect(sumArray([])).toBe(0);
  });

  it('should return the single element for a single-element array', () => {
    expect(sumArray([5])).toBe(5);
    expect(sumArray([0])).toBe(0);
  });

  it('should calculate sum of positive numbers', () => {
    expect(sumArray([1, 2, 3, 4, 5])).toBe(15);
  });

  it('should calculate sum of negative numbers', () => {
    expect(sumArray([-1, -2, -3])).toBe(-6);
  });

  it('should handle mixed positive, negative, and zero values', () => {
    expect(sumArray([-1, 2, 0, -3, 4])).toBe(2);
  });

  it('should handle large numbers accurately', () => {
    expect(sumArray([1000000, 2000000, 3000000])).toBe(6000000);
  });
});
