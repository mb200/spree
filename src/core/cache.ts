/* eslint-disable @typescript-eslint/no-explicit-any */
import LRUCache from "lru-cache";
import { fromPromise, Subject } from "./rx";
import { Cache, Result } from "./types";

function createCache<V>(): Cache<V> {
  const lruCache = new LRUCache<string, Subject<Result<V>>>();

  function getResult(
    key: string,
    fallback: () => Promise<V>
  ): Subject<Result<V>> {
    const entry = lruCache.get(key);

    if (entry === undefined) {
      const result = fromPromise(fallback());
      lruCache.set(key, result);

      return result;
    } else {
      return entry;
    }
  }

  const cache: Cache<V> = {
    read: (key, fallback) => getResult(key, fallback).getValue(),
    write: (key, value) => {
      const existing = lruCache.get(key);

      if (existing) {
        existing.next(value);
      } else {
        lruCache.set(key, new Subject(value));
      }
    },
    clear: (filterFn) => {
      lruCache
        .keys()
        .filter(filterFn)
        .forEach((keyToDelete) => lruCache.del(keyToDelete));
    },
    subscribe: (key, fallback, obs) => {
      const subject$ = getResult(key, fallback);
      return subject$.subscribe(obs);
    },
    keys: () => lruCache.keys(),
  };

  return cache;
}

export { createCache };
