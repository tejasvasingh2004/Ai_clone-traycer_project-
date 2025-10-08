export function sumArray(numbers: number[]): number {
    return numbers.reduce((acc, curr) => acc + curr, 0);
}