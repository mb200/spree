import { TC39Observer } from "../../core/types";
import { createSubject } from "../../rx/subject";

class TestObserver<T> implements TC39Observer<T> {
  results: (T | string)[] = [];

  next(value: T): void {
    this.results.push(value);
  }

  error(err: Error): void {
    this.results.push(`Error: ${err.message}`);
  }

  complete(): void {
    this.results.push("done");
  }
}

test("emits value to observer on next", () => {
  // Given: a simple subject.
  const subject = createSubject(10);

  // When: we subscribe to it.
  const observer = new TestObserver<number>();
  subject.subscribe(observer);

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10]);

  // When: we call next.
  subject.next(27);

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10, 27]);
});

test("does not emit values after complete", () => {
  // Given: a simple subject.
  const subject = createSubject(10);

  // When: we subscribe to it.
  const observer = new TestObserver<number>();
  subject.subscribe(observer);

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10]);

  // When: we call next.
  subject.next(27);
  subject.next(29);
  subject.next(31);
  subject.next(35);

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10, 27, 29, 31, 35]);

  // When: we call complete.
  subject.complete();

  // Then: it should not emit any further values.
  subject.next(99);
  subject.next(101);
  expect(observer.results).toEqual([10, 27, 29, 31, 35, "done"]);
});

test("does not emit values after unsubscribe", () => {
  // Given: a simple subject.
  const subject = createSubject(10);

  // When: we subscribe to it.
  const observer = new TestObserver<number>();
  subject.subscribe(observer);

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10]);

  // When: we call next.
  subject.next(27);
  subject.next(29);

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10, 27, 29]);

  // When: we call unsubscribe on the subject.
  subject.unsubscribe();

  // Then: it should not emit valeus to the observer.
  subject.next(99);
  subject.next(101);
  expect(observer.results).toEqual([10, 27, 29]);

  // When: a new observer tries to subscribe.
  const observer2 = new TestObserver<number>();
  subject.subscribe(observer2);

  // Then: it should get the latest value, but no future values.
  expect(observer2.results).toEqual([29]);
  subject.next(103);
  subject.next(105);
  expect(observer2.results).toEqual([29]);
});

test("emits the latest value to new observers", () => {
  // Given: a simple subject.
  const subject = createSubject(10);

  // When: we subscribe to it.
  const observer = new TestObserver<number>();
  const subscription = subject.subscribe(observer);

  // And: we call next.
  subject.next(27);
  subject.next(29);
  subject.next(31);
  subject.next(35);
  subscription.unsubscribe();

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10, 27, 29, 31, 35]);

  const anotherObserver = new TestObserver<number>();
  subject.subscribe(anotherObserver);

  // Then: it should emit ONLY the last value to that subscription.
  expect(anotherObserver.results).toEqual([35]);
});

test("broadcasts to multiple subscribers", async () => {
  // Given: a simple subject.
  const subject = createSubject(10);

  // When: multiple subscribers subscribe to it.
  const observer1 = new TestObserver<number>();
  const observer2 = new TestObserver<number>();
  const subscription1 = subject.subscribe(observer1);
  const subscription2 = subject.subscribe(observer2);

  // And: we call next.
  subject.next(27);
  subject.next(29);
  subject.next(31);
  subject.next(35);

  // Then: it should emit all of the values.
  expect(observer1.results).toEqual([10, 27, 29, 31, 35]);
  expect(observer2.results).toEqual([10, 27, 29, 31, 35]);

  // When: one unsubscribes.
  subscription1.unsubscribe();

  // And: new values are pushed in.
  subject.next(100);

  // Then: the still-subscribed observer should see the new values.
  expect(subscription2.closed).toBeFalsy();
  expect(observer2.results).toEqual([10, 27, 29, 31, 35, 100]);

  // And: the unsubscribed observer should not.
  expect(subscription1.closed).toBeTruthy();
  expect(observer1.results).toEqual([10, 27, 29, 31, 35]);
});

test("does not emit more values to observer after it unsubscribes", () => {
  // Given: a simple subject.
  const subject = createSubject(10);

  // When: we subscribe to it.
  const observer = new TestObserver<number>();
  const subscription = subject.subscribe(observer);

  // And: we call next.
  subject.next(27);
  subject.next(29);
  subject.next(31);
  subject.next(35);

  // Then: it should emit the initial value.
  expect(observer.results).toEqual([10, 27, 29, 31, 35]);

  // When: we unsubscribe.
  subscription.unsubscribe();

  // Then: it should not emit any further values.
  subject.next(99);
  subject.next(101);
  expect(observer.results).toEqual([10, 27, 29, 31, 35]);
});
