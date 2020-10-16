/* eslint-disable @typescript-eslint/no-explicit-any */
import LRUCache from "lru-cache";
import {
  Cache,
  EmptyResult,
  PendingResult,
  RejectedResult,
  ResolvedResult,
  Result,
  ResultStatus,
} from "./types";

function createCache<V>(): Cache<V> {
  const lruCache = new LRUCache<string, Result<V>>();

  function getResult(key: string): Result<V> {
    const entry = lruCache.get(key);

    if (entry === undefined) {
      const result: EmptyResult = {
        status: ResultStatus.EMPTY,
        value: null,
      };

      lruCache.set(key, result);

      return result;
    } else {
      return entry;
    }
  }

  // Passing by reference is ESSENTIAL so that we can update the object in memory
  // asynchronously.
  function load<V>(result: Result<V>, thenable: Promise<V>): void {
    const pendingResult: PendingResult<V> = (result as unknown) as PendingResult<
      V
    >;
    pendingResult.status = ResultStatus.PENDING;
    pendingResult.value = thenable;

    thenable.then(
      (value) => {
        if (pendingResult.status === ResultStatus.PENDING) {
          const resolvedResult = (pendingResult as unknown) as ResolvedResult<
            V
          >;
          resolvedResult.status = ResultStatus.RESOLVED;
          resolvedResult.value = value;
        }
      },
      (error) => {
        if (pendingResult.status === ResultStatus.PENDING) {
          const rejectedResult = (pendingResult as unknown) as RejectedResult;
          rejectedResult.status = ResultStatus.REJECTED;
          rejectedResult.value = error;
        }
      }
    );
  }

  const cache: Cache<V> = {
    read: (key, fallback) => {
      const result = getResult(key);

      switch (result.status) {
        case ResultStatus.EMPTY: {
          const promise = fallback();
          load(result, promise);
          throw promise;
        }
        case ResultStatus.PENDING: {
          throw result.value;
        }
        case ResultStatus.REJECTED: {
          throw result.value;
        }
        case ResultStatus.RESOLVED: {
          return result.value;
        }
        default:
          throw new Error("Unknown status!");
      }
    },
    preload: (key, fallback) => {
      const result = getResult(key);

      switch (result.status) {
        case ResultStatus.EMPTY: {
          const promise = fallback();
          load(result, promise);
          return;
        }
        default:
          return;
      }
    },
  };

  return cache;
}

export { createCache };
