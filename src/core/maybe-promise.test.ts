import { test, expect } from "bun:test";
import { MaybePromise } from "./maybe-promise";

test("some / none / fromValue", async () => {
  expect(await MaybePromise.some(42)).toBe(42);
  const none = await MaybePromise.none;
  expect(none).toBeUndefined();
  const folded = await MaybePromise.fromValue<number>(Promise.resolve(null));
  expect(folded).toBeUndefined();
  expect(await MaybePromise.fromValue(Promise.resolve(5))).toBe(5);
});

test("map / andThen / filter with async callbacks", async () => {
  expect(await MaybePromise.map(MaybePromise.some(21), async (n) => n * 2)).toBe(42);
  expect(await MaybePromise.map(MaybePromise.none, (n: number) => n * 2)).toBeUndefined();
  expect(await MaybePromise.andThen(MaybePromise.some(4), (n) => MaybePromise.some(n + 1))).toBe(5);
  expect(await MaybePromise.filter(MaybePromise.some(4), async (n) => n > 10)).toBeUndefined();
});

test("unwrap / match / collections", async () => {
  expect(await MaybePromise.unwrapOr(MaybePromise.none, 7)).toBe(7);
  expect(
    await MaybePromise.match(MaybePromise.some(1), (n) => `some:${n}`, () => "none"),
  ).toBe("some:1");
  expect(await MaybePromise.all([MaybePromise.some(1), MaybePromise.some(2)])).toEqual([1, 2]);
  expect(await MaybePromise.all([MaybePromise.some(1), MaybePromise.none])).toBeUndefined();
  expect(await MaybePromise.firstSome([MaybePromise.none, MaybePromise.some(9)])).toBe(9);
});

test("bridges: okOr / toOption", async () => {
  expect((await MaybePromise.okOr(MaybePromise.some(5), "absent")).unwrap()).toBe(5);
  expect((await MaybePromise.okOr(MaybePromise.none, "absent")).unwrapErr()).toBe("absent");
  expect(await MaybePromise.toOption(MaybePromise.none)).toBe(null);
});

test("MaybePromise.safeTry short-circuits on undefined", async () => {
  const good = await MaybePromise.safeTry(async function* () {
    const a = yield* MaybePromise.safeUnwrap(MaybePromise.some(2));
    return a + 1;
  });
  expect(good).toBe(3);

  const none = await MaybePromise.safeTry(async function* () {
    yield* MaybePromise.safeUnwrap(MaybePromise.none); // short-circuits; the rest is unreachable
    return 99;
  });
  expect(none).toBeUndefined();
});
