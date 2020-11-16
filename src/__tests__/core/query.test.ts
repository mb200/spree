import { createQuery } from "../../core/query";
import { Result } from "../../core/types";
import { isPromise } from "../../core/utils";
import { delayedPromise, flushPromises, waitFor } from "../../test-utils";

afterEach(() => {
  jest.resetAllMocks();
});

test("wraps the given async loader and preloads it", async () => {
  // Given: a mock function.
  const mockClient = jest.fn((id: number) => Promise.resolve("test" + id));

  // When: we create the query.
  const query = createQuery(mockClient);

  // And: initialize the spree
  query(1);

  // Then: it should have called the client without calling .read().
  expect(mockClient).toHaveBeenCalledWith(1);
});

test("caches the value across multiple reads", async () => {
  // Given: a mock function
  const mockClient = jest.fn((id: number) => Promise.resolve("test" + id));

  // When: we create the query.
  const query = createQuery(mockClient);

  // And: call it repeatedly.
  const spree = query(1);
  let promise: Promise<string> | undefined;
  try {
    spree.read();
    spree.read();
    spree.read();
    spree.read();
  } catch (errOrPromise) {
    if (isPromise(errOrPromise)) {
      promise = errOrPromise;
    }
  }

  // Then: it should have only called the client once.
  expect(await promise).toEqual("test1");
  expect(spree.read()).toEqual("test1");
  expect(mockClient).toHaveBeenCalledWith(1);
  expect(mockClient).toBeCalledTimes(1);
});

test("caches entries for multiple arguments", async () => {
  // Given: a query.
  const mockFetcher = jest.fn((id: number) => Promise.resolve("test" + id));
  const query = createQuery(mockFetcher);

  // When: we call the query.
  let spree = query(1);
  await flushPromises();

  // Then: it should resolve and cache the result.
  expect(spree.read()).toEqual("test1");
  expect(spree.read()).toEqual("test1");
  expect(mockFetcher).toHaveBeenCalledTimes(1);

  // When: we call the query with a new arg (creating a new spree).
  spree = query(2);
  await flushPromises();

  // Then: it should resolve and cache the result.
  expect(spree.read()).toEqual("test2");
  expect(spree.read()).toEqual("test2");
  expect(mockFetcher).toHaveBeenCalledTimes(2);

  // When: we re-call the query with the original arg.
  spree = query(1);

  // Then: it should return the cached result without calling the client again.
  expect(mockFetcher).toHaveBeenCalledTimes(2);
  expect(spree.read()).toEqual("test1");
});

test("allows users to mutate and subscribe to the cache", async () => {
  // Given: a mock function
  const mockClient = jest.fn((id: number) => Promise.resolve("test" + id));

  // When: we create the query.
  const query = createQuery(mockClient);
  const spree = query(1);

  // Then: it should return the first result.
  await waitFor(() => expect(spree.read()).toEqual("test1"));

  // When: we subscribe to the cached result.
  let result: Result<string>;
  spree.subscribe((val) => {
    result = val;
  });

  // When: someone mutates it.
  spree.mutate(() => Promise.resolve("test2"));

  // Then: it should have updated all subscribers.
  await waitFor(() => expect(result.value).toEqual("test2"));

  // And: still only called the client once.
  expect(mockClient).toHaveBeenCalledWith(1);
  expect(mockClient).toBeCalledTimes(1);
});

test("prevents race conditions when there are overlapping mutations", async () => {
  jest.useFakeTimers();

  // Given: a mock function.
  const mockFetcher = jest
    .fn<Promise<string>, [number]>()
    .mockImplementationOnce((id: number) => Promise.resolve("test" + id))
    .mockImplementation((id: number) =>
      Promise.resolve("revalidated-test" + id)
    );
  const mockMutator = jest
    .fn<Promise<string>, []>()
    .mockImplementationOnce(() => delayedPromise("mutation1", 50))
    .mockImplementationOnce(() => delayedPromise("mutation2", 20));

  // When: we create the query.
  const query = createQuery(mockFetcher);
  const spree = query(1);
  await flushPromises();

  // When: we subscribe to the cached result.
  let result: Result<string> | undefined;
  spree.subscribe((val) => {
    result = val;
  });

  // When: someone makes overlapping mutations
  spree.mutate(mockMutator);
  jest.advanceTimersByTime(10);
  spree.mutate(mockMutator);

  // Then: the mutations should NOT update the value
  jest.advanceTimersByTime(50);
  expect(result?.value).toEqual("test1");
  jest.advanceTimersByTime(50);
  expect(result?.value).toEqual("test1");

  // And: it should have revalidated using the original fetch fn.
  await waitFor(() => expect(mockFetcher).toBeCalledTimes(2));
  expect(result?.value).toEqual("revalidated-test1");
  expect(mockFetcher).toHaveBeenCalledWith(1);

  jest.useRealTimers();
});

test("revalidates if mutation fails", async () => {
  // Given: a mock function.
  const mockFetcher = jest
    .fn<Promise<string>, [number]>()
    .mockImplementationOnce((id: number) => Promise.resolve("test" + id))
    .mockImplementation((id: number) =>
      Promise.resolve("revalidated-test" + id)
    );
  const mockMutator = jest.fn<Promise<string>, []>().mockRejectedValue("FAIL");

  // When: we create the query.
  const query = createQuery(mockFetcher);
  const spree = query(1);
  await flushPromises();

  // When: we subscribe to the cached result.
  let result: Result<string> | undefined;
  spree.subscribe((val) => {
    result = val;
  });

  // When: we try to mutate the value
  spree.mutate(mockMutator);

  // Then: the mutations should NOT update the value
  expect(result?.value).toEqual("test1");

  // And: it should have revalidated using the original fetch fn.
  await waitFor(() => expect(mockFetcher).toBeCalledTimes(2));
  expect(result?.value).toEqual("revalidated-test1");
  expect(mockFetcher).toHaveBeenCalledWith(1);
});

test("only revalidates once if overlapping mutations fail", async () => {
  jest.useFakeTimers();

  // Given: a mock function.
  const mockFetcher = jest
    .fn<Promise<string>, [number]>()
    .mockImplementationOnce((id: number) => Promise.resolve("test" + id))
    .mockImplementation((id: number) =>
      Promise.resolve("revalidated-test" + id)
    );
  const mockMutator = jest.fn<Promise<string>, []>().mockRejectedValue("FAIL");

  // When: we create the query.
  const query = createQuery(mockFetcher);
  const spree = query(1);
  await flushPromises();

  // When: we subscribe to the cached result.
  let result: Result<string> | undefined;
  spree.subscribe((val) => {
    result = val;
  });

  // When: someone makes overlapping mutations
  spree.mutate(mockMutator);
  jest.advanceTimersByTime(10);
  spree.mutate(mockMutator);

  // Then: the mutations should NOT update the value
  jest.advanceTimersByTime(50);
  expect(result?.value).toEqual("test1");
  jest.advanceTimersByTime(50);
  expect(result?.value).toEqual("test1");

  // And: it should have revalidated using the original fetch fn.
  await waitFor(() => expect(mockFetcher).toBeCalledTimes(2));
  expect(result?.value).toEqual("revalidated-test1");
  expect(mockFetcher).toHaveBeenCalledWith(1);

  jest.useRealTimers();
});

test("allows users to revalidate current entry and (optionally) clear all other entries", async () => {
  // Given: a query.
  const mockFetcher = jest.fn((id: number) => Promise.resolve("test" + id));
  const query = createQuery(mockFetcher);

  // When: we call the query.
  let spree = query(1);
  await flushPromises();

  // Then: it should resolve and cache the result.
  expect(spree.read()).toEqual("test1");
  expect(spree.read()).toEqual("test1");
  expect(mockFetcher).toHaveBeenCalledTimes(1);

  // When: we call the query with a new arg (creating a new spree).
  spree = query(2);
  await flushPromises();

  // Then: it should resolve and cache the result.
  expect(spree.read()).toEqual("test2");
  expect(spree.read()).toEqual("test2");
  expect(mockFetcher).toHaveBeenCalledTimes(2);

  // When: we revalidate.
  spree.revalidate();
  await flushPromises();

  // Then: it should have called the client again.
  expect(mockFetcher).toHaveBeenCalledTimes(3);
  expect(spree.read()).toEqual("test2");

  // When: we re-call the query with the original arg.
  spree = query(1);

  // Then: it should return the cached result without calling the client again.
  expect(mockFetcher).toHaveBeenCalledTimes(3);
  expect(spree.read()).toEqual("test1");

  // When: we revalidate and ask it to reset the cache.
  spree.revalidate({ resetCache: true });
  await flushPromises();

  // Then: it should have called the client again.
  expect(mockFetcher).toHaveBeenCalledTimes(4);
  expect(spree.read()).toEqual("test1");

  // And blown out the cache for all other args.
  spree = query(2);
  await flushPromises();
  expect(mockFetcher).toHaveBeenCalledTimes(5);
  expect(spree.read()).toEqual("test2");
});
