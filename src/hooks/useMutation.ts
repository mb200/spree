import { useCallback, useEffect, useReducer, useRef } from "react";
import type { MutationOptions, Spree } from "../core/types";

type MutationState = {
  isCommitting: boolean;
  error: Error | null;
};

type MutationAction =
  | { type: "reset" }
  | { type: "mutation-pending" }
  | { type: "mutation-success" }
  | { type: "mutation-error"; error: Error };

const initialState: MutationState = { isCommitting: false, error: null };

function mutationReducer(
  oldState: MutationState,
  action: MutationAction
): MutationState {
  switch (action.type) {
    case "reset":
      return { ...oldState, error: null };
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
          const response = await updater();

          return response;
        } catch (e) {
          dispatch({ type: "mutation-error", error: e });

          throw e;
        }
      };

      const mutated = await spree.mutate(wrappedUpdater, options);
      if (isMounted.current && mutated) dispatch({ type: "mutation-success" });
    },
    [spree]
  );

  // Clear the error state if a new value has been inserted into cache (from revalidation or other).
  useEffect(() => {
    const subscription = spree.subscribe((_v) => dispatch({ type: "reset" }));

    return () => subscription.unsubscribe();
  }, [spree]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, [isMounted]);

  return [commit, state];
}

export { useMutation };
