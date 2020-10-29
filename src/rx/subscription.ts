import { TC39Subscription } from "../core/types";

function createSubscription(teardown?: () => void): TC39Subscription {
  let closed = false;

  return {
    get closed() {
      return closed;
    },
    unsubscribe: () => {
      closed = true;
      if (teardown) teardown();
    },
  };
}

export { createSubscription };
