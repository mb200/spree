import { createQuery } from "../../core/query";
import { Result } from "../../core/types";
import { isPromise } from "../../core/utils";
import { waitFor } from "../../test-utils";

jest.useFakeTimers();

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
  await waitFor(() => expect(spree.read()).toEqual("test1"));
  expect(mockClient).toHaveBeenCalledWith(1);
  expect(mockClient).toBeCalledTimes(1);
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
  await waitFor(() => expect(result.value).toEqual("test1"));

  // And: still only called the client once.
  expect(mockClient).toHaveBeenCalledWith(1);
  expect(mockClient).toBeCalledTimes(1);
});
