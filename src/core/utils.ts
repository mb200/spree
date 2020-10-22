/** A generic function that executes nothing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noop(..._args: any[]): void {
  // no-op
}

type MaybeThenable<T> = { then?: (cb: () => void) => Promise<T> };
function isPromise<T>(obj: MaybeThenable<T>): boolean {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
}

export { noop, isPromise };
