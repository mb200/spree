import { useCallback, useEffect, useRef, useState } from "react";
import type { Spree } from "../core/types";

function useMutation<V>(
  spree: Spree<V>
): [
  (updater: () => Promise<V>, optimisticUpdate?: V) => Promise<void>,
  boolean
] {
  const [isCommiting, setIsCommiting] = useState(false);
  const isMounted = useRef(true);

  const commit = useCallback(
    async (updater: () => Promise<V>, optimisticUpdate?: V) => {
      if (isMounted.current) setIsCommiting(true);

      const wrappedUpdater = async (): Promise<V> => {
        try {
          return await updater();
        } finally {
          if (isMounted.current) setIsCommiting(false);
        }
      };

      spree.mutate(wrappedUpdater, optimisticUpdate);
    },
    [spree]
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return [commit, isCommiting];
}

export { useMutation };
