import { createCache } from "../../core/cache";
import { Result, ResultStatus } from "../../core/types";
import { noop } from "../../core/utils";
import { delay, waitFor } from "../../test-utils";

jest.useFakeTimers();

test("reads missing result from server", async () => {
  // Given: a basic client with no cached value.
  let promise;
  const client = jest.fn(() => {
    promise = Promise.resolve(27).then(delay(100));
    return promise;
  });

  // When: we create the cache with no value, and try to read.
  const cache = createCache();
  const result = cache.read("test", client);

  // Then: it should return a pending result.
  jest.advanceTimersByTime(10);
  expect(result).toEqual({ status: ResultStatus.PENDING, value: promise });

  // Then: return the resolved result.
  jest.advanceTimersByTime(100);
  await waitFor(() =>
    expect(result).toEqual({ status: ResultStatus.RESOLVED, value: 27 })
  );
});

test("reads cached result", async () => {
  // Given: a basic client and an empty cache.
  const client = jest.fn().mockResolvedValue(32);
  const cache = createCache();

  // When: we call read.
  const result = cache.read("test", client);

  // Then: it should call client and return the result.
  await waitFor(() =>
    expect(result).toEqual({ status: ResultStatus.RESOLVED, value: 32 })
  );
  expect(client).toHaveBeenCalledTimes(1);

  // When: we call read again.
  const result2 = cache.read("test", client);

  // Then: it should return the cached value, but not call the client.
  expect(result2).toEqual({ status: ResultStatus.RESOLVED, value: 32 });
  expect(client).toHaveBeenCalledTimes(1);
});

test("writes to cache", () => {
  // Given: a basic client and an empty cache.
  const client = jest.fn().mockResolvedValue(32);
  const cache = createCache();

  // When: we write to the cache.
  cache.write("test", {
    status: ResultStatus.RESOLVED,
    value: 21,
  });

  // Then: it should return that new value on read().
  expect(cache.read("test", client)).toEqual({
    status: ResultStatus.RESOLVED,
    value: 21,
  });
  // And: have never called the client.
  expect(client).toHaveBeenCalledTimes(0);
});

test("notifies subscribers of all changes", async () => {
  // Given: a basic client and an empty cache.
  let promise;
  const client = jest.fn(() => {
    promise = Promise.resolve(32).then(delay(100));
    return promise;
  });
  const cache = createCache<number>();

  // When: we subscribe.
  let subscribedValue: Result<number> | undefined;
  cache.subscribe("test", client, {
    next: (val) => {
      subscribedValue = val;
    },
    error: noop,
    complete: noop,
  });

  // Then: we should get the current pending result (fetched from the server).
  jest.advanceTimersByTime(10);
  expect(subscribedValue).toEqual({
    status: ResultStatus.PENDING,
    value: promise,
  });

  // Which should resolve.
  jest.advanceTimersByTime(100);
  await waitFor(() =>
    expect(subscribedValue).toEqual({
      status: ResultStatus.RESOLVED,
      value: 32,
    })
  );

  // When: someone writes to the cache.
  cache.write("test", { status: ResultStatus.RESOLVED, value: 1 });

  // Then: our listener should update the value.
  expect(subscribedValue).toEqual({ status: ResultStatus.RESOLVED, value: 1 });
});

test("clears all matching entries", () => {
  // Given: a basic cache with a few entries.
  const cache = createCache<number>();
  const result = (v: number): Result<number> => ({
    status: ResultStatus.RESOLVED,
    value: v,
  });
  cache.write("a", result(1));
  cache.write("absynth", result(2));
  cache.write("ballet", result(3));

  // When: we clear all entries starting with "a".
  cache.clear((k) => /^a/i.test(k));

  // Then: we should only have one entry left.
  expect(cache.keys()).toEqual(["ballet"]);
});
