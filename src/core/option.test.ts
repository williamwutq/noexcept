import { test, expect } from "bun:test";
import { Option } from "./option.js";

test("some / none / guards", () => {
  expect(Option.isSome(Option.some(42))).toBe(true);
  expect(Option.isNone(Option.none)).toBe(true);
  expect(Option.isSome(0)).toBe(true); // zero is present
});

test("map / andThen / filter leave none untouched", () => {
  expect(Option.map(21, (n) => n * 2)).toBe(42);
  expect(Option.map(null as Option<number>, (n) => n * 2)).toBe(null);
  expect(Option.andThen(4, (n) => (n > 0 ? n : null))).toBe(4);
  expect(Option.filter(4, (n) => n > 10)).toBe(null);
});

test("unwrap variants", () => {
  expect(Option.unwrapOr(null as Option<number>, 7)).toBe(7);
  expect(Option.unwrapOrElse(null as Option<number>, () => 9)).toBe(9);
  expect(() => Option.unwrap(null as Option<number>)).toThrow();
});

test("or / and / zip", () => {
  expect(Option.or(null as Option<number>, 5)).toBe(5);
  expect(Option.and(1, "x")).toBe("x");
  expect(Option.zip(1, "x")).toEqual([1, "x"]);
  expect(Option.zip(1, null as Option<string>)).toBe(null);
});

test("collection utilities", () => {
  expect(Option.filterSome([1, null, 3])).toEqual([1, 3]);
  expect(Option.all([1, 2, 3])).toEqual([1, 2, 3]);
  expect(Option.all([1, null, 3])).toBe(null);
});

test("bridge to Maybe", () => {
  expect(Option.toMaybe(null as Option<number>)).toBeUndefined();
  expect(Option.fromMaybe(undefined as number | undefined)).toBe(null);
});

test("predicate helpers", () => {
  expect(Option.isSomeAnd(4, (n) => n > 0)).toBe(true);
  expect(Option.isSomeAnd(null as Option<number>, (n) => n > 0)).toBe(false);
  expect(Option.isNoneOr(null as Option<number>, (n) => n > 0)).toBe(true);
  expect(Option.isNoneOr(-1, (n) => n > 0)).toBe(false);
});

test("lazy / none-side combinators", () => {
  expect(Option.orElse(null as Option<number>, () => 5)).toBe(5);
  expect(Option.mapOrElse(null as Option<number>, () => "none", (n) => `some:${n}`)).toBe("none");
  expect(Option.mapNone(null as Option<number>, () => 0)).toBe(0);
});

test("xor / zipWith / unzip", () => {
  expect(Option.xor(1, null as Option<number>)).toBe(1);
  expect(Option.xor(1, 2)).toBe(null);
  expect(Option.zipWith(2, 3, (a, b) => a + b)).toBe(5);
  expect(Option.zipWith(2, null as Option<number>, (a, b) => a + b)).toBe(null);
  expect(Option.unzip([1, "a"] as Option<[number, string]>)).toEqual([1, "a"]);
  expect(Option.unzip(null as Option<[number, string]>)).toEqual([null, null]);
});

test("tap returns the option", () => {
  let seen = 0;
  const r = Option.tap(9, (n) => {
    seen = n;
  });
  expect(seen).toBe(9);
  expect(r).toBe(9);
});

test("construction: fromNullable / fromPredicate / firstSome", () => {
  expect(Option.fromNullable(undefined)).toBe(null);
  expect(Option.fromNullable(5)).toBe(5);
  expect(Option.fromPredicate(5, (n) => n > 0)).toBe(5);
  expect(Option.fromPredicate(-5, (n) => n > 0)).toBe(null);
  expect(Option.firstSome([null, null, 3, 4])).toBe(3);
  expect(Option.firstSome([null, null])).toBe(null);
});

test("bridge to Result: okOr / okOrElse", () => {
  expect(Option.okOr(5, "absent").unwrap()).toBe(5);
  expect(Option.okOr(null as Option<number>, "absent").unwrapErr()).toBe("absent");
  expect(Option.okOrElse(null as Option<number>, () => "computed").unwrapErr()).toBe("computed");
});

test("Option.safeTry chains and short-circuits on none", () => {
  const findA = (): Option<number> => 2;
  const findB = (n: number): Option<number> => (n > 0 ? n * 10 : null);

  const good = Option.safeTry(function* () {
    const a = yield* Option.safeUnwrap(findA());
    const b = yield* Option.safeUnwrap(findB(a));
    return a + b;
  });
  expect(good).toBe(22);

  const none = Option.safeTry(function* () {
    const a = yield* Option.safeUnwrap(null as Option<number>); // short-circuits
    const b = yield* Option.safeUnwrap(findB(a));
    return a + b;
  });
  expect(none).toBe(null);
});
