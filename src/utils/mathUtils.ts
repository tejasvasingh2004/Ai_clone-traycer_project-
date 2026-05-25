// This function calculates the sum of an array of numbers.
export function sumArray(numbers: number[]): number {
    return numbers.reduce((acc, curr) => acc + curr, 0);
}