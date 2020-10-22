/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hashing function to deterministically stringify arguments used in Sprees.
 */
function hash<Args extends any[]>(...args: Args): string {
  return JSON.stringify(args, stableStringifyReplacer);
}

function stableStringifyReplacer(_key: string, value: any): unknown {
  if (typeof value === "function") {
    throw new Error();
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = value[key];
        return result;
      }, {} as any);
  }

  return value;
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
function isObject(o: any): boolean {
  return Object.prototype.toString.call(o) === "[object Object]";
}

function isPlainObject(maybeObject: any): boolean {
  if (isObject(maybeObject) === false) return false;

  // If has modified constructor
  if (maybeObject.constructor === undefined) return true;

  // If has modified prototype
  if (isObject(maybeObject.constructor.prototype) === false) return false;

  // If constructor does not have an Object-specific method
  if (
    maybeObject.constructor.prototype.hasOwnProperty("isPrototypeOf") === false
  ) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

export { hash };
