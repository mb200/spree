import { waitFor } from "@testing-library/react";
import { createResource } from "../../core/resource";

type Entity = { id: number; name: string };
const mockClient = jest.fn<Promise<Entity>, [number]>();

jest.useFakeTimers();

afterEach(() => {
  mockClient.mockReset();
});

test("should wrap a client function and create a valid reference", async () => {
  // Given: a client fn.
  mockClient.mockResolvedValue({ id: 1, name: "name" });

  // When: we wrap the resource.
  const createSpree = createResource(mockClient);

  // And: initialize the spree
  const spree = createSpree(1);

  // Then: it should have called the client.
  expect(mockClient).toHaveBeenCalledWith(1);

  // And: created the correct reference metadata on the spree object.
  expect(spree.reference).toEqual(
    expect.objectContaining({
      key: mockClient,
      args: [1],
    })
  );
});

test("should create a read() property that returns a suspended promise", async () => {
  // Given: a client fn.
  mockClient.mockImplementation(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id: 1, name: "name" });
      }, 100);
    });
  });

  // When: we wrap the resource.
  const createSpree = createResource(mockClient);

  // And: initialize the spree
  const spree = createSpree(1);

  // Then: it should have called the client.
  expect(mockClient).toHaveBeenCalledWith(1);

  // And: suspended the promise.
  try {
    spree.read();
  } catch (promiseOrError) {
    expect(isPromise(promiseOrError)).toBe(true);
  }

  // And: which will eventually resolve with a value.
  await waitFor(() => expect(spree.read()).toEqual({ id: 1, name: "name" }));
});

type MaybeThenable<T> = { then?: (cb: () => void) => Promise<T> };
function isPromise<T>(obj: MaybeThenable<T>): boolean {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
}
