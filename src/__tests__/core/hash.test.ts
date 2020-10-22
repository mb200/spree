import { hash } from "../../core/hash";

test("hashes simple args deterministically", () => {
  expect(hash(1, "seven")).toEqual(`[1,"seven"]`);
  expect(hash("one", "seven", 12)).toEqual(`["one","seven",12]`);
  expect(hash(1, "seven", "twelve", 27)).toEqual(`[1,"seven","twelve",27]`);
  expect(hash(1, false, NaN, undefined)).toEqual(`[1,false,null,null]`);
  expect(hash(1, -27, null)).toEqual(`[1,-27,null]`);
});

test("hashes objects deterministically", () => {
  // sorts objects by key.
  expect(hash({ one: 12, two: 27, alpha: 18 })).toEqual(
    JSON.stringify([{ alpha: 18, one: 12, two: 27 }])
  );
  expect(hash({ 1: "test", 5: "test2", a: "test" })).toEqual(
    `[{"1":"test","5":"test2","a":"test"}]`
  );
  expect(hash({ z: "test", 5: "test", 1: "test2" })).toEqual(
    `[{"1":"test2","5":"test","z":"test"}]`
  );

  // sorts nested objects by key.
  expect(hash({ zebra: 27, args: { search: "test", alpha: ["a"] } })).toEqual(
    `[{"args":{"alpha":["a"],"search":"test"},"zebra":27}]`
  );

  // mixed args
  expect(hash(27, { zebra: 27, alpha: "test" })).toEqual(
    `[27,{"alpha":"test","zebra":27}]`
  );
});
