/* eslint-disable @typescript-eslint/no-explicit-any */

/** A Subscription is the response an Observable returns when something
 *  subscribes to it.
 *
 * Calling `unsubscribe()` always removes the subescription and "cleans up".
 */
export type TC39Subscription = {
  /**  Cancels the subscription */
  unsubscribe(): void;
  /**  A boolean value indicating whether the subscription is closed */
  closed: boolean;
};

/**
 * An Observer is an object that is used to "listen" to changes in an Observable.
 */
export type TC39Observer<T> = {
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
export type TC39Observable<T> = {
  /**  Subscribes to the sequence with an observer */
  subscribe(observer: TC39Observer<T>): TC39Subscription;
};

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
export type Subject<V> = TC39Observer<V> &
  TC39Observable<V> & { getValue: () => V; unsubscribe: () => void };

/**
 * Spree Resource Types
 */

export type Hash = (() => string) | string;

export enum ResultStatus {
  PENDING,
  RESOLVED,
  REJECTED,
}

export type PendingResult<Data> = {
  status: ResultStatus.PENDING;
  value: Promise<Data>;
};

export type ResolvedResult<Data> = {
  status: ResultStatus.RESOLVED;
  value: Data;
};

export type RejectedResult = {
  status: ResultStatus.REJECTED;
  value: Error;
};

export type Result<Data> =
  | PendingResult<Data>
  | ResolvedResult<Data>
  | RejectedResult;

export type Query<V, A extends any[]> = (...args: A) => Spree<V>;
export type Mutation<V, A extends any[]> = (...args: A) => SpreeMutation<V>;
export type MutationOptions<V> = {
  optimisticUpdate?: V;
  resetCache?: boolean;
};

export type Cache<V> = {
  read(key: string, fallback: () => Promise<V>): Result<V>;
  write(key: string, value: Result<V>): void;
  clear(filterFn: (key: string) => boolean): void;
  subscribe(
    key: string,
    fallback: () => Promise<V>,
    subscriber: TC39Observer<Result<V>>
  ): TC39Subscription;
  keys(): string[];
};

export type Spree<V> = {
  read(): V;
  preload(): void;
  subscribe(onNext: (value: Result<V>) => void): TC39Subscription;
  mutate(
    commitChange: () => Promise<V>,
    options?: MutationOptions<V>
  ): Promise<void>;
  revalidate(): Promise<void>;
};

export interface SpreeMutation<V> {
  mutate(): Subject<Result<V>>;
}
