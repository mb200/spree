/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Spree Resource Types
 */

export type Hash = (() => string) | string;

export type Cache<V> = {
  read(key: string, fallback: () => Promise<V>): V;
  preload(key: string, fallback: () => Promise<V>): void;
};

export enum ResultStatus {
  EMPTY,
  PENDING,
  RESOLVED,
  REJECTED,
}

export type EmptyResult = {
  status: ResultStatus.EMPTY;
  value: null;
};

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
  | EmptyResult
  | PendingResult<Data>
  | ResolvedResult<Data>
  | RejectedResult;

export type Resource<V, A extends any[]> = (...args: A) => Spree<V, A>;

export interface Spree<V, A extends any[]> {
  read(): V;
  preload(): void;
  reference: Reference<V, A>;
}

export interface Readable<V> {
  read(): V;
}

export interface Reference<V, A extends any[]> {
  key: (...args: A) => Promise<V>;
  args: A;
  hash: Hash;
}
