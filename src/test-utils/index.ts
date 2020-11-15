import React from "react";
import ReactDOM from "react-dom";
import Scheduler from "scheduler";

type ExperimentalScheduler = typeof Scheduler & {
  unstable_advanceTime(time: number): void;
  unstable_flushAll(): void;
};

let root: ReactDOM.Root | undefined;

function render(jsx: React.ReactElement): void {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = ReactDOM.unstable_createRoot(container);
  root.render(jsx);
}

function cleanup(): void {
  if (root) {
    root.unmount();
    root = undefined;
  }

  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

function advanceTimers(time: number): void {
  (Scheduler as ExperimentalScheduler).unstable_advanceTime(time);
  jest.advanceTimersByTime(time);
}

function flushAll(): void {
  (Scheduler as ExperimentalScheduler).unstable_flushAll();
}

function advanceAllTimers(): void {
  jest.runAllTimers();
}

async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function delay<C>(time: number): (v: C) => Promise<C> {
  return (value: C) =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, time);
    });
}

function delayedPromise<C>(result: C, time: number): Promise<C> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(result);
    }, time);
  });
}

function sleep(period: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, period);
  });
}

interface Props {
  fallback: React.ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return {
      error,
    };
  }

  componentDidCatch(error: Error): void {
    console.error(error);
  }

  render(): React.ReactNode | null {
    if (this.state.error) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export { fireEvent, screen, waitFor } from "@testing-library/react";
// Export act from test-utils for Suspense support.
export { act } from "react-dom/test-utils";
// Export our own custom functions.
export {
  advanceTimers,
  advanceAllTimers,
  cleanup,
  delay,
  delayedPromise,
  ErrorBoundary,
  flushAll,
  flushPromises,
  render,
  sleep,
};
