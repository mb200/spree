import isEqual from "fast-deep-equal";
import { useEffect, useRef, useState } from "react";
import type { Query, Spree } from "../core/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useQuery<V, A extends any[]>(query: Query<V, A>, args: A): Spree<V> {
  const [spree, setSpree] = useState(() => query(...args));
  const previousArgs = useRef(args);
  const hasSubscribed = useRef(false);
  const [, setUpdateCount] = useState(0);

  // Generate a new spree when args change — this requires users use memoization.
  useEffect(() => {
    if (!isEqual(args, previousArgs.current)) {
      previousArgs.current = args;
      setSpree(query(...args));
    }
  }, [args, query]);

  // Subscribe to changes —— like loading and mutations.
  useEffect(() => {
    const subscription = spree.subscribe(() => {
      // Subject observables return a value on initial subscribe.
      // We already have that value, so we'll ignore it.
      if (!hasSubscribed.current) {
        hasSubscribed.current = true;
        return;
      }
      setUpdateCount((update) => update + 1);
    });

    return () => subscription.unsubscribe();
  }, [spree]);

  return spree;
}

export { useQuery };
