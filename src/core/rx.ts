import { RejectedResult, ResolvedResult, Result, ResultStatus } from "./types";

/** A Subscription is the response an Observable returns when something
 *  subscribes to it.
 *
 * Calling `unsubscribe()` always removes the subescription and "cleans up".
 */
type TC39Subscription<T> = {
  /**  Cancels the subscription */
  unsubscribe(): void;
  /**  A boolean value indicating whether the subscription is closed */
  closed: boolean;
};

/**
 * An Observer is an object that is used to "listen" to changes in an Observable.
 */
type TC39Observer<T> = {
  /**  Receives the next value in the sequence */
  next(value: T): void;

  /**  Receives the sequence error */
  error(errorValue: Error): void;

  /**  Receives a completion notification */
  complete(): void;
};

/**
 * An Observable is an object that allows outside observers to subscribe to changes.
 *
 * Calling `subscribe()` on an observable always returns a Subscription.
 */
interface TC39Observable<T> {
  /**  Subscribes to the sequence with an observer */
  subscribe(observer: TC39Observer<T>): TC39Subscription<T>;
}

/**
 * A Subject is a special kind of Observable that is HYBRID between an observable
 * and an observer.
 *
 * It exposes `next()`, `error()`, and `complete()` to outside objects,
 * which allows them to update the internal state. This is not typical
 * for observables, which manage their own state and only expose `subscribe()`
 * to outside objects.
 *
 *  It also exposes `subscribe()` and always emit its current value to every new
 * observer. This behavior is unique to Subjects. Typically observables only emit
 * values when they **change**, but Subjects always emit their current value to
 * new observers WHEN they subscribe.
 *
 * This HYBRID combination of `subscribe() and `next/error/complete()` allows us to
 * both listen to the Spree cache AND write to it, with "write" actions automatically
 * pushing updates to all other listeners.
 */
class Subject<T> implements TC39Observer<T>, TC39Observable<T> {
  private _closed = false;
  private _observers: TC39Observer<T>[] = [];

  constructor(private _value: T) {}

  getValue(): T {
    return this._value;
  }

  next(value: T): void {
    if (!this._closed) {
      this._value = value;
      const { _observers: observers } = this;

      observers.slice().forEach((sub) => sub.next(value));
    }
  }

  error(err: Error): void {
    if (!this._closed) {
      const { _observers: observers } = this;

      observers.slice().forEach((sub) => sub.error(err));
    }
  }

  complete(): void {
    this._closed = true;
    const { _observers: observers } = this;

    observers.slice().forEach((sub) => sub.complete());
  }

  subscribe(observer: TC39Observer<T>): TC39Subscription<T> {
    // Emit the current value to new subscribers.
    observer.next(this.getValue());
    this._observers.push(observer);

    return new SubjectSubscription(this, observer);
  }

  unsubscribe(): void {
    this._observers = [];
  }

  removeObserver(observer: TC39Observer<T>): void {
    const { _observers: observers } = this;

    if (!observers || observers.length === 0) {
      return;
    }

    const matchIdx = observers.indexOf(observer);

    if (matchIdx !== -1) {
      observers.splice(matchIdx, 1);
    }
  }
}

class SubjectSubscription<T> implements TC39Subscription<T> {
  private _closed = false;

  constructor(private subject: Subject<T>, private observer: TC39Observer<T>) {}

  get closed(): boolean {
    return this._closed;
  }

  unsubscribe(): void {
    if (this._closed) {
      return;
    }

    this._closed = true;
    this.subject.removeObserver(this.observer);
  }
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
  return new Subject<Result<V>>(result);
}

export { fromPromise, Subject };
export type { TC39Observable, TC39Observer, TC39Subscription };
