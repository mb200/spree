import { suspendResult } from "../../core/suspense";
import { ResultStatus } from "../../core/types";
import { isPromise, noop } from "../../core/utils";

test("suspends a pending result", () => {
  try {
    suspendResult({ status: ResultStatus.PENDING, value: new Promise(noop) });
  } catch (promise) {
    expect(isPromise(promise)).toBe(true);
  }
});

test("throws a rejected result", () => {
  try {
    suspendResult({ status: ResultStatus.REJECTED, value: new Error("TEST") });
  } catch (error) {
    expect(error.message).toEqual("TEST");
  }
});

test("returns a resolved result", () => {
  expect(suspendResult({ status: ResultStatus.RESOLVED, value: 27 })).toEqual(
    27
  );
});
