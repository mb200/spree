import {
  RejectedResult,
  ResolvedResult,
  Result,
  ResultStatus,
  Subject,
  TC39Observer,
} from "../core/types";
import { createSubscription } from "./subscription";

function createSubject<V>(intialValue: V): Subject<V> {
  let value = intialValue;
  let closed = false;
  let observers: TC39Observer<V>[] = [];

  return {
    getValue: () => value,
    next: (val) => {
      if (!closed) {
        value = val;
        observers.slice().forEach((sub) => sub.next(value));
      }
    },
    error: (err) => {
      if (!closed) {
        observers.slice().forEach((sub) => sub.error(err));
      }
    },
    complete: () => {
      closed = true;
      observers.slice().forEach((sub) => sub.complete());
    },
    subscribe: (observer) => {
      observer.next(value);
      observers.push(observer);

      const teardown = (): void => {
        if (!observers || observers.length === 0) {
          return;
        }

        const matchIdx = observers.indexOf(observer);

        if (matchIdx !== -1) {
          observers.splice(matchIdx, 1);
        }
      };

      return createSubscription(teardown);
    },
    unsubscribe: () => {
      closed = true;
      observers = [];
    },
  };
}

function fromPromise<V>(thenable: Promise<V>): Subject<Result<V>> {
  const result: Result<V> = {
    status: ResultStatus.PENDING,
    value: thenable,
  };

  thenable.then(
    (value) => {
      const pendingResult = (result as unknown) as ResolvedResult<V>;
      pendingResult.status = ResultStatus.RESOLVED;
      pendingResult.value = value;
    },
    (error) => {
      const errorResult = (result as unknown) as RejectedResult;
      errorResult.status = ResultStatus.REJECTED;
      errorResult.value = error;
    }
  );

  // Passing by reference ensures the the value held in the Subject is
  // updated when the promise resolves/rejects.
  return createSubject(result);
}

export { fromPromise, createSubject };
