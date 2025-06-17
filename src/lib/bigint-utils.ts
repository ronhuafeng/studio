import JSONbig from 'json-bigint';

// Configure json-bigint to handle large integers
const JSONBig = JSONbig({
  storeAsString: false, // Keep as BigInt for internal processing
  useNativeBigInt: true, // Use native BigInt
});

/**
 * Parse JSON with proper bigint support for large integers
 * @param jsonString - The JSON string to parse
 * @returns Parsed object with bigints for large numeric values
 */
export function parseJsonWithBigInt(jsonString: string): any {
  try {
    return JSONBig.parse(jsonString);
  } catch (error) {
    // Fallback to regular JSON.parse if json-bigint fails
    console.warn('json-bigint parsing failed, falling back to regular JSON.parse:', error);
    return JSON.parse(jsonString, (key, value) => {
      // Convert uuid, parentId, from, to fields to bigint if they are numeric
      if (key === 'uuid' || key === 'parentId' || key === 'from' || key === 'to') {
        if (typeof value === 'string' || typeof value === 'number') {
          try {
            // Handle special case for -1 (used for no parent)
            if (value === '-1' || value === -1) {
              return BigInt(-1);
            }
            return BigInt(value);
          } catch (e) {
            // If conversion fails, return the original value
            return value;
          }
        }
      }
      return value;
    });
  }
}

/**
 * Format a bigint for display in the graph
 * Truncates to 8 digits with leading '..' for longer values
 * @param value - The bigint value to format
 * @returns Formatted string for display
 */
export function formatBigIntForDisplay(value: bigint): string {
  const str = value.toString();
  if (str.length <= 8) {
    return str;
  }
  return `..${str.slice(-7)}`;
}

/**
 * Format a bigint for display in the properties editor (full value, readonly)
 * @param value - The bigint value to format
 * @returns Full string representation
 */
export function formatBigIntForEditor(value: bigint): string {
  return value.toString();
}

/**
 * Check if a value is a bigint
 * @param value - The value to check
 * @returns True if the value is a bigint
 */
export function isBigInt(value: any): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Convert bigint values to strings for JSON serialization
 * @param obj - The object to stringify
 * @returns JSON string with bigints converted to strings
 */
export function stringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}
