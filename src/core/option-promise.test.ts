import { test, expect } from "bun:test";
import { OptionPromise } from "./option-promise";

test("some / none / fromValue", async () => {
  expect(await OptionPromise.some(42)).toBe(42);
  expect(await OptionPromise.none).toBe(null);
  expect(await OptionPromise.fromValue(Promise.resolve(undefined))).toBe(null);
  expect(await OptionPromise.fromValue(Promise.resolve(5))).toBe(5);
});

test("map / andThen / filter with async callbacks", async () => {
  expect(await OptionPromise.map(OptionPromise.some(21), async (n) => n * 2)).toBe(42);
  expect(await OptionPromise.map(OptionPromise.none, (n: number) => n * 2)).toBe(null);
  expect(
    await OptionPromise.andThen(OptionPromise.some(4), (n) => OptionPromise.some(n + 1)),
  ).toBe(5);
  expect(await OptionPromise.filter(OptionPromise.some(4), async (n) => n > 10)).toBe(null);
});

test("unwrap / match / or", async () => {
  expect(await OptionPromise.unwrapOr(OptionPromise.none, 7)).toBe(7);
  expect(await OptionPromise.unwrapOrElse(OptionPromise.none, async () => 9)).toBe(9);
  expect(
    await OptionPromise.match(OptionPromise.some(1), (n) => `some:${n}`, () => "none"),
  ).toBe("some:1");
  expect(await OptionPromise.or(OptionPromise.none, OptionPromise.some(3))).toBe(3);
});

test("collections: all / filterSome / firstSome", async () => {
  expect(await OptionPromise.all([OptionPromise.some(1), Promise.resolve(2 as number | null)])).toEqual([1, 2]);
  expect(await OptionPromise.all([OptionPromise.some(1), OptionPromise.none])).toBe(null);
  expect(await OptionPromise.filterSome([OptionPromise.some(1), OptionPromise.none, OptionPromise.some(3)])).toEqual([1, 3]);
  expect(await OptionPromise.firstSome([OptionPromise.none, OptionPromise.some(9)])).toBe(9);
});

test("bridges: okOr resolves to a ResultPromise; toMaybe", async () => {
  expect((await OptionPromise.okOr(OptionPromise.some(5), "absent")).unwrap()).toBe(5);
  expect((await OptionPromise.okOr(OptionPromise.none, "absent")).unwrapErr()).toBe("absent");
  const crossed = await OptionPromise.toMaybe(OptionPromise.none);
  expect(crossed).toBeUndefined();
});

test("tap resolves to the option unchanged", async () => {
  let seen = 0;
  const r = await OptionPromise.tap(OptionPromise.some(8), (n) => {
    seen = n;
  });
  expect(seen).toBe(8);
  expect(r).toBe(8);
});
