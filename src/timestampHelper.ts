/**
 * Timestamp helper functions.
 */

/**
 * Gets the current timestamp in milliseconds.
 *
 * @returns The current timestamp in milliseconds.
 */
function getCurrentTimestamp(): number {
  return new Date().getTime();
}

/**
 * Converts a date to a timestamp in milliseconds.
 *
 * @param date The date to convert.
 * @returns The timestamp in milliseconds.
 */
function dateToTimestamp(date: Date): number {
  return date.getTime();
}

/**
 * Converts a timestamp in milliseconds to a date.
 *
 * @param timestamp The timestamp in milliseconds.
 * @returns The date.
 */
function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Formats a timestamp in milliseconds to a human-readable string.
 *
 * @param timestamp The timestamp in milliseconds.
 * @returns The formatted timestamp string.
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

export { getCurrentTimestamp, dateToTimestamp, timestampToDate, formatTimestamp };