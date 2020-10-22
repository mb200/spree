import { Result, ResultStatus } from "./types";

function suspendResult<V>(result: Result<V>): V {
  switch (result.status) {
    case ResultStatus.PENDING: {
      throw result.value;
    }
    case ResultStatus.REJECTED: {
      throw result.value;
    }
    case ResultStatus.RESOLVED: {
      return result.value;
    }
    default:
      throw new Error("Unknown status!");
  }
}

export { suspendResult };
