/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hashing function to deterministically stringify arguments used in Sprees.
 */
function hash<Args extends any[]>(...args: Args): string {
  return JSON.stringify(args);
}

export { hash };
