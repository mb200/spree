import React, { Suspense, unstable_useTransition, useState } from "react";
import { createResource } from "../../core/resource";
import { Spree } from "../../core/types";
import {
  act,
  ErrorBoundary,
  fireEvent,
  render,
  screen,
} from "../../test-utils";

const mockClient = jest.fn<Promise<string>, [boolean]>();
const mockResource = createResource(mockClient);

jest.useFakeTimers();

afterEach(() => {
  jest.resetAllMocks();
});

test("should re-render and re-fetch when setSpree is called", async () => {
  // Given: a Spree with a basic client fn.
  serverWillReturn("test");

  // When: a component renders with a spree.
  act(() => {
    render(<Harness />);
  });

  act(() => {
    jest.advanceTimersByTime(10);
  });

  // Then: it should show a fallback;
  expect(screen.getByText("Loading...")).toBeInTheDocument();

  // When: the promise resolves.
  await act(async () => {
    jest.runAllTimers();
  });

  // Then: it should have called the client and rendered the result.
  expect(screen.getByText("test")).toBeInTheDocument();
  expect(mockClient).toHaveBeenCalledTimes(1);

  // When: we update the Spree.
  serverWillReturn("new test");

  await act(async () => {
    fireEvent.click(screen.getByText(/update/i));
  });

  await act(async () => {
    jest.runAllTimers();
  });

  // Then: the component should re-render with the new result.
  expect(screen.getByText("new test")).toBeInTheDocument();
  expect(mockClient).toHaveBeenCalledTimes(2);
});

test.todo("should show error fallback on error");
test.todo("should suspend a suspended spree until it's updated");
test.todo("should transition before suspending during refresh");

function serverWillReturn(value: string): void {
  mockClient.mockImplementation(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, 100);
    });
  });
}

const SpreeComponent: React.FC<{ spree: Spree<string, [boolean]> }> = ({
  spree,
}) => {
  const results = spree.read();

  return <div>{results}</div>;
};

const Harness: React.FC = () => {
  const [spree, setSpree] = useState(() => mockResource(true));
  const [startTransition] = unstable_useTransition();

  return (
    <ErrorBoundary fallback={<h1>Error</h1>}>
      <button
        onClick={() => {
          startTransition(() => {
            setSpree(() => mockResource(false));
          });
        }}
      >
        update
      </button>
      <Suspense fallback={<div>Loading...</div>}>
        <SpreeComponent spree={spree} />
      </Suspense>
    </ErrorBoundary>
  );
};
