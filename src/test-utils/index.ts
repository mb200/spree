import React from "react";
import ReactDOM from "react-dom";

let root: ReactDOM.Root | undefined;

function render(jsx: React.ReactElement): void {
  cleanup();

  const elem = document.createElement("div");
  document.body.appendChild(elem);
  root = ReactDOM.unstable_createRoot(elem);

  root.render(jsx);
}

function cleanup(): void {
  if (root) {
    root.unmount();
    root = undefined;
  }

  while (document.body.firstChild) {
    document.removeChild(document.body.firstChild);
  }
}

interface Props {
  fallback: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  render(): React.ReactNode | null {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export { fireEvent, screen } from "@testing-library/react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export { act } from "react-dom/test-utils";
export { ErrorBoundary };
export { render };
