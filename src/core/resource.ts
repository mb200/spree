/* eslint-disable @typescript-eslint/no-explicit-any */
import { createCache } from "./cache";
import { hash } from "./hash";
import { Resource } from "./types";

function createResource<V, A extends any[]>(
  loadResource: (...args: A) => Promise<V>
): Resource<V, A> {
  // Resource/Spree specific cache.
  const cache = createCache<V>();

  return (...args) => {
    const key = hash(...args);

    const fallback: () => Promise<V> = () => loadResource(...args);

    // Preload everything.
    cache.preload(key, fallback);

    return {
      read: () => {
        return cache.read(key, fallback);
      },
      preload: () => {
        return cache.preload(key, fallback);
      },
      reference: { key: loadResource, args, hash: key },
    };
  };
}

export { createResource };
