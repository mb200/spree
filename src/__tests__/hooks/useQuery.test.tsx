import React, { Suspense, useState } from "react";
import { createQuery } from "../../core/query";
import { Query, Spree } from "../../core/types";
import { useQuery } from "../../hooks/useQuery";
import {
  act,
  cleanup,
  ErrorBoundary,
  fireEvent,
  render,
  screen,
} from "../../test-utils";

jest.useFakeTimers();

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

test("suspends and shows fallback", async () => {
  // Given: a Spree with a basic client fn.
  let resolve: (val: string) => void;
  const client = jest.fn(() => {
    return new Promise<string>((res) => {
      resolve = res;
    });
  });
  const mockQuery = createQuery(client);

  // When: a component renders with a spree.
  await act(async () => render(<Harness query={mockQuery} />));

  // Then: it should show a fallback;
  expect(screen.getByText("Loading...")).toBeInTheDocument();

  // When: the promise resolves.
  await act(async () => {
    resolve("test");
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);
});

test("suspends and then renders data", async () => {
  // Given: a Spree with a basic client fn.
  const client = createClient().mockResolvedValue("test");
  const mockQuery = createQuery(client);

  // When: a component renders with a spree.
  await act(async () => {
    render(<Harness query={mockQuery} />);
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(client).toHaveBeenCalledTimes(1);
});

test("recreates spree and refetches when args change", async () => {
  // Given: a Spree with a basic client fn.
  const mockClient = createClient()
    .mockResolvedValueOnce("test")
    .mockResolvedValueOnce("test2");
  const mockQuery = createQuery(mockClient);

  // When: a component renders with a spree.
  await act(async () => {
    render(<Harness query={mockQuery} />);
  });

  // Then: it should have called the client and rendered the result.
  expect(mockClient).toHaveBeenCalledTimes(1);
  expect(screen.getByText("test")).toBeInTheDocument();

  // When: we trigger an update to the args.
  await act(async () => {
    fireEvent.click(screen.getByText(/toggle/i));
  });

  expect(screen.getByText("test2")).toBeInTheDocument();
  expect(mockClient).toHaveBeenCalledTimes(2);
});

test("should show error fallback on error", async () => {
  // Given: a Spree with a basic client fn that will throw.
  const mockClient = createClient().mockImplementation(() =>
    Promise.reject("Error")
  );
  const mockQuery = createQuery(mockClient);

  // Mock console to prevent noise.
  const original = console.error;
  console.error = jest.fn();

  // When: a component renders with a spree.
  await act(async () => {
    render(<Harness query={mockQuery} />);
  });

  // Then: it should have called the client.
  expect(mockClient).toHaveBeenCalledTimes(1);

  // And: displayed the error boundary fallback.
  expect(screen.getByText(/error/i)).toBeInTheDocument();
  console.error = original;
});

function createClient(): jest.Mock<Promise<string>, [boolean]> {
  return jest.fn<Promise<string>, [boolean]>();
}

const SpreeComponent: React.FC<{ spree: Spree<string> }> = ({ spree }) => {
  const results = spree.read();

  return <div>{results}</div>;
};

const Harness: React.FC<{ query: Query<string, [boolean]> }> = ({ query }) => {
  const [flag, setFlag] = useState(true);
  const spree = useQuery(query, [flag]);

  return (
    <ErrorBoundary fallback={<h1>Error</h1>}>
      <Suspense fallback={<div>Loading...</div>}>
        <button onClick={() => setFlag(!flag)}>Toggle</button>
        <SpreeComponent spree={spree} />
      </Suspense>
    </ErrorBoundary>
  );
};
