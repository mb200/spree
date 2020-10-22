/* eslint-disable @typescript-eslint/no-explicit-any */
import { createCache } from "./cache";
import { hash } from "./hash";
import { suspendResult } from "./suspense";
import { Query, ResultStatus } from "./types";
import { noop } from "./utils";

function createQuery<V, A extends any[]>(
  queryResource: (...args: A) => Promise<V>
): Query<V, A> {
  // Resource/Spree specific cache.
  const cache = createCache<V>();

  return (...args) => {
    const key = hash(...args);

    const fallback: () => Promise<V> = () => queryResource(...args);

    // Preload everything.
    cache.read(key, fallback);

    return {
      read: () => suspendResult(cache.read(key, fallback)),
      preload: () => {
        cache.read(key, fallback);
      },
      subscribe: (obs) => {
        return cache.subscribe(key, fallback, {
          next: obs,
          error: noop,
          complete: noop,
        });
      },
      mutate: async (commit, value) => {
        // Optimistically update in cache, if given a value.
        if (value) cache.write(key, { status: ResultStatus.RESOLVED, value });

        // Revalidate, then update cache.
        commit().then(
          (v) =>
            cache.write(key, {
              status: ResultStatus.RESOLVED,
              value: v,
            }),
          (e) => {
            // If there's an error updating, we need to refetch, then update the cache.
            console.error(e);
            fallback().then(
              (v) =>
                cache.write(key, {
                  status: ResultStatus.RESOLVED,
                  value: v,
                }),
              (e) =>
                cache.write(key, {
                  status: ResultStatus.REJECTED,
                  value: e,
                })
            );
          }
        );
      },
    };
  };
}

export { createQuery };
