import React, { Suspense } from "react";
import { createQuery } from "../../core/query";
import { MutationOptions, Query, Spree } from "../../core/types";
import { useMutation } from "../../hooks/useMutation";
import { useQuery } from "../../hooks/useQuery";
import {
  act,
  advanceAllTimers,
  cleanup,
  delayedError,
  delayedPromise,
  ErrorBoundary,
  fireEvent,
  flushPromises,
  render,
  screen,
  waitFor,
} from "../../test-utils";

jest.mock("scheduler", () => require("scheduler/unstable_mock"));

beforeAll(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  jest.useRealTimers();
});

test("mutates the cache with value returned by the commit function", async () => {
  // Given: a Spree with a basic client fn.
  const { client, updater } = createMocks();
  client.mockResolvedValue("test");
  updater.mockImplementation(() => delayedPromise("updated-test", 100));

  // When: a component renders with a spree.
  const mockQuery = createQuery(client);
  await act(async () => {
    render(<Harness query={mockQuery} updater={updater} />);
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);

  // When: we commit a mutation.
  await act(async () => {
    fireEvent.click(screen.getByText(/mutate/i));
  });

  // Then: it should have called the mutation client and shown a loader.
  expect(screen.getByText(/committing/i)).toBeInTheDocument();

  await act(async () => {
    advanceAllTimers();
    await flushPromises();
  });

  // Then: updated the cache and DOM with the result from the mutation
  expect(screen.getByText("updated-test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);
  expect(updater).toHaveBeenCalledTimes(1);
});

test("mutates the cache with optimistic update then returned value", async () => {
  // Given: a Spree with a basic client fn.
  const { client, updater } = createMocks();
  client.mockResolvedValue("test");
  updater.mockImplementation(() => delayedPromise("actual-test", 100));

  // And: the mutation will return a different value than its optimistic/expected result.
  const options: MutationOptions<string> = {
    optimisticUpdate: "expected-test",
  };

  // When: a component renders with a spree.
  const mockQuery = createQuery(client);
  await act(async () => {
    render(
      <Harness query={mockQuery} updater={updater} commitOptions={options} />
    );
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);

  // When: we commit a mutation.
  await act(async () => {
    fireEvent.click(screen.getByText(/mutate/i));
  });

  // Then: it should have called the mutation client and shown a loader.
  expect(screen.getByText(/committing/i)).toBeInTheDocument();
  // And: updated the cache and DOM with the optimistic update.
  expect(screen.getByText("expected-test")).toBeInTheDocument();

  await act(async () => {
    advanceAllTimers();
    await flushPromises();
  });

  // Then: updated the cache and DOM with the actual result from the mutation
  expect(screen.getByText("actual-test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);
  expect(updater).toHaveBeenCalledTimes(1);
});

test("displays error when mutation fails, then revalidates", async () => {
  // Given: a Spree with a basic client fn.
  const { client, updater } = createMocks();
  client
    .mockImplementationOnce(() => delayedPromise("test", 50))
    .mockImplementationOnce(() => delayedPromise("revalidated-test", 50));
  updater.mockImplementation(() => delayedError("FAIL", 100));

  // When: a component renders with a spree.
  const mockQuery = createQuery(client);
  await act(async () => {
    render(<Harness query={mockQuery} updater={updater} />);
  });

  await act(async () => {
    jest.advanceTimersByTime(50);
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);

  // When: we commit a mutation.
  await act(async () => {
    fireEvent.click(screen.getByText(/mutate/i));
  });

  // Then: it should have called the mutation client and shown a loader.
  expect(screen.getByText(/committing/i)).toBeInTheDocument();

  // When: the mutation fails.
  await act(async () => {
    jest.advanceTimersByTime(100);
    await flushPromises();
  });

  // Then: it should show the error.
  await waitFor(() => expect(screen.getByText(/fail/i)).toBeInTheDocument());
  // And: kick off a revalidation request.
  await waitFor(() => expect(client).toHaveBeenCalledTimes(2));

  await act(async () => {
    advanceAllTimers();
    await flushPromises();
  });

  // Then: update the cache and DOM with the revalidation result
  expect(screen.getByText("revalidated-test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(2);
  expect(updater).toHaveBeenCalledTimes(1);
});

test("handles serial multiple mutations", async () => {
  // Given: a Spree with a basic client fn.
  const { client, updater } = createMocks();
  client.mockImplementation(() => delayedPromise("test", 50));
  updater
    .mockImplementationOnce(() => delayedPromise("mutation-test1", 100))
    .mockImplementationOnce(() => delayedPromise("mutation-test2", 100));

  // When: a component renders with a spree.
  const mockQuery = createQuery(client);
  await act(async () => {
    render(<Harness query={mockQuery} updater={updater} />);
  });

  await act(async () => {
    jest.advanceTimersByTime(50);
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);

  // When: we commit a mutation.
  await act(async () => {
    fireEvent.click(screen.getByText(/mutate/i));
    jest.advanceTimersByTime(100);
    await flushPromises();
  });

  // Then: it should update the cache and DOM with the mutation result
  expect(screen.getByText("mutation-test1")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);
  expect(updater).toHaveBeenCalledTimes(1);

  // When: we commit another mutation.
  await act(async () => {
    fireEvent.click(screen.getByText(/mutate/i));
    jest.advanceTimersByTime(100);
    await flushPromises();
  });

  // Then: it should update the cache and DOM with the mutation result
  expect(screen.getByText("mutation-test2")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);
  expect(updater).toHaveBeenCalledTimes(2);
});

test("handles race conditions with parallel mutations", async () => {
  // Given: a Spree with a basic client fn.
  const { client, updater } = createMocks();
  client
    .mockImplementationOnce(() => delayedPromise("test", 50))
    .mockImplementationOnce(() => delayedPromise("revalidated-test", 50));
  updater
    .mockImplementationOnce(() => delayedPromise("mutation-test1", 100))
    .mockImplementationOnce(() => delayedPromise("mutation-test2", 100));

  // When: a component renders with a spree.
  const mockQuery = createQuery(client);
  await act(async () => {
    render(<Harness query={mockQuery} updater={updater} />);
  });

  await act(async () => {
    jest.advanceTimersByTime(50);
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);

  // When: we trigger a mutation.
  await act(async () => {
    fireEvent.click(screen.getByText(/mutate/i));
    jest.advanceTimersByTime(50);
  });

  // And: then another overlapping (parallel) mutation.
  await act(async () => {
    fireEvent.click(screen.getByText(/mutate/i));
  });

  // When: the first mutation resolves.
  await act(async () => {
    jest.advanceTimersByTime(50);
  });

  // Then: it should NOT update the cache or the DOM with the mutation result
  expect(client).toHaveBeenCalledTimes(1);
  expect(updater).toHaveBeenCalledTimes(2);
  expect(screen.getByText("test")).toBeInTheDocument();

  // And: still show a loading state while the second mutation and validation are pending.
  expect(screen.getByText(/committing/i)).toBeInTheDocument();

  // When: the second mutation resolves.
  await act(async () => {
    jest.advanceTimersByTime(50);
  });

  // Then: it should trigger a revalidation and update the cache and DOM with the revalidation result
  await waitFor(() => expect(client).toHaveBeenCalledTimes(2));

  await act(async () => {
    advanceAllTimers();
    await flushPromises();
  });
  expect(screen.getByText("revalidated-test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(2);
  expect(updater).toHaveBeenCalledTimes(2);
});

function createMocks(): {
  client: jest.Mock<Promise<string>, []>;
  updater: jest.Mock<Promise<string>, []>;
} {
  const client = jest.fn<Promise<string>, []>();
  const updater = jest.fn<Promise<string>, []>();

  return { client, updater };
}

function SpreeComponent(props: { spree: Spree<string> }): React.ReactElement {
  const { spree } = props;
  const results = spree.read();

  return <div>{results}</div>;
}

function MutationComponent(props: {
  spree: Spree<string>;
  updater: () => Promise<string>;
  commitOptions?: MutationOptions<string>;
}): React.ReactElement {
  const { spree, updater, commitOptions } = props;
  const [commit, { isCommitting, error }] = useMutation(spree);

  return (
    <div>
      <button onClick={() => commit(updater, commitOptions)}>Mutate</button>
      {error && <div data-testid="error">{error.message}</div>}
      {isCommitting && <div data-testid="committing">Committing</div>}
    </div>
  );
}

function Harness(props: {
  query: Query<string, []>;
  updater: () => Promise<string>;
  commitOptions?: MutationOptions<string>;
}): React.ReactElement {
  const { query, updater, commitOptions } = props;
  const spree = useQuery(query, []);

  return (
    <ErrorBoundary fallback={<h1>Error</h1>}>
      <Suspense fallback={<div>Loading...</div>}>
        <SpreeComponent spree={spree} />
        <MutationComponent
          spree={spree}
          updater={updater}
          commitOptions={commitOptions}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
