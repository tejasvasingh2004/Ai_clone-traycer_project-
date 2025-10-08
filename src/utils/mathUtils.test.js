import { sumArray } from './mathUtils';

describe('sumArray', () => {
    it('should return 0 for an empty array', () => {
        expect(sumArray([])).toBe(0);
    });

    it('should return the sum of a single element array', () => {
        expect(sumArray([5])).toBe(5);
    });

    it('should return the sum of multiple elements', () => {
        expect(sumArray([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should handle negative numbers', () => {
        expect(sumArray([-1, -2, -3])).toBe(-6);
    });

    it('should handle mixed positive and negative numbers', () => {
        expect(sumArray([-1, 2, -3, 4])).toBe2);
    });

    it('should handle large numbers', () => {
        expect(sumArray([1000000, 2000000, 3000000])).toBe(6000000);
    });
});