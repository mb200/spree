import { useCallback, useEffect, useReducer, useRef } from "react";
import type { MutationOptions, Spree } from "../core/types";

type MutationState = {
  isCommitting: boolean;
  error: Error | null;
};

type MutationAction =
  | { type: "mutation-pending" }
  | { type: "mutation-success" }
  | { type: "mutation-error"; error: Error };

const initialState: MutationState = { isCommitting: false, error: null };

function mutationReducer(
  oldState: MutationState,
  action: MutationAction
): MutationState {
  switch (action.type) {
    case "mutation-pending":
      return { isCommitting: true, error: null };
    case "mutation-success":
      return { isCommitting: false, error: null };
    case "mutation-error":
      return { isCommitting: false, error: action.error };
    default:
      return oldState;
  }
}

function useMutation<V>(
  spree: Spree<V>
): [
  (updater: () => Promise<V>, options?: MutationOptions<V>) => Promise<void>,
  MutationState
] {
  const [state, dispatch] = useReducer(mutationReducer, initialState);
  const isMounted = useRef(true);

  const commit = useCallback(
    async (updater: () => Promise<V>, options?: MutationOptions<V>) => {
      if (isMounted.current) dispatch({ type: "mutation-pending" });

      const wrappedUpdater = async (): Promise<V> => {
        try {
          return await updater();
        } catch (e) {
          dispatch({ type: "mutation-error", error: e });
          throw e;
        } finally {
          if (isMounted.current) dispatch({ type: "mutation-success" });
        }
      };

      spree.mutate(wrappedUpdater, options);
    },
    [spree]
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return [commit, state];
}

export { useMutation };
