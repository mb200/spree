/* eslint-disable @typescript-eslint/no-explicit-any */
import { createCache } from "./cache";
import { hash } from "./hash";
import { suspendResult } from "./suspense";
import { Query, ResultStatus, Spree } from "./types";
import { noop } from "./utils";

function createQuery<V, A extends any[]>(
  queryResource: (...args: A) => Promise<V>
): Query<V, A> {
  // Resource/Spree specific cache.
  const cache = createCache<V>();
  let pendingMutations = 0;
  let shouldRevalidateAfterLastMutation = false;

  return (...args) => {
    const key = hash(...args);

    const fallback: () => Promise<V> = () => queryResource(...args);
    const revalidate: () => Promise<void> = () =>
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
      revalidate: async (options = {}) => {
        const { resetCache } = options;

        // Clear all other cache entries.
        if (resetCache) cache.clear((k) => k !== key);

        return revalidate();
      },
      mutate: async (commit, options = {}) => {
        const { optimisticUpdate, resetCache } = options;

        /**
         * Possible Race Conditions.
         *
         * If there are overlapping async mutations, each with its own response state:
         *
         * case 1:
         *   m1------------------>r1
         *       m2------>r2
         *
         * case 2:
         *   m1------>r1
         *       m2------------>r2
         *
         *
         * To avoid an invalid final state, if there are overlapping mutations,
         * we should 1) Not update the state from either response, and 2) wait for
         * the longest mutation to complete and then revalidate.
         *
         */
        pendingMutations += 1;
        shouldRevalidateAfterLastMutation = pendingMutations > 1 ? true : false;

        // Optimistically update in cache, if given a value.
        if (optimisticUpdate) {
          cache.write(key, {
            status: ResultStatus.RESOLVED,
            value: optimisticUpdate,
          });
        }

        // Clear all other cache entries.
        if (resetCache) cache.clear((k) => k !== key);

        // Use the commit result to update the cache for this entry, if there hasn't been another mutation.
        try {
          const v = await commit();
          if (pendingMutations <= 1) {
            cache.write(key, {
              status: ResultStatus.RESOLVED,
              value: v,
            });
          }
        } catch (e) {
          // If there's an error updating, we need to revalidate and use that to update the cache instead.
          shouldRevalidateAfterLastMutation = true;
        } finally {
          pendingMutations -= 1;
          if (pendingMutations === 0) {
            if (shouldRevalidateAfterLastMutation) {
              return revalidate().then(() => true);
            } else {
              return true;
            }
          } else {
            return false;
          }
        }
      },
    };
  };
}

function createPreloadedSpree<V>(queryResource: () => Promise<V>): Spree<V> {
  return createQuery(queryResource)();
}

export { createQuery, createPreloadedSpree };
