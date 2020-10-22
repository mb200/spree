/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TC39Observer, TC39Subscription } from "./rx";
import { Subject } from "./rx";

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

export type Cache<V> = {
  read(key: string, fallback: () => Promise<V>): Result<V>;
  write(key: string, value: Result<V>): void;
  // preload(key: string, fallback: () => Promise<V>): void;
  subscribe(
    key: string,
    fallback: () => Promise<V>,
    subscriber: TC39Observer<Result<V>>
  ): TC39Subscription<Result<V>>;
  // revalidate(key: string, fallback: () => Promise<V>): void;
};

export type Spree<V> = {
  read(): V;
  preload(): void;
  subscribe(onNext: (value: Result<V>) => void): TC39Subscription<Result<V>>;
  mutate(commitChange: () => Promise<V>, optimisticValue?: V): Promise<void>;
};

export interface SpreeMutation<V> {
  mutate(): Subject<Result<V>>;
}
