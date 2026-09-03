import { test, expect } from "bun:test";
import { Maybe } from "./maybe";

test("some / none / guards", () => {
  expect(Maybe.isSome(Maybe.some(1))).toBe(true);
  expect(Maybe.isNone(Maybe.none)).toBe(true);
  expect(Maybe.isSome(null)).toBe(true); // null is present; only undefined is absent
});

test("map / andThen / unwrap", () => {
  expect(Maybe.map(21, (n) => n * 2)).toBe(42);
  expect(Maybe.map(undefined as Maybe<number>, (n) => n * 2)).toBeUndefined();
  expect(Maybe.andThen(4, (n) => (n > 0 ? n : undefined))).toBe(4);
  expect(Maybe.unwrapOr(undefined as Maybe<number>, 7)).toBe(7);
  expect(() => Maybe.unwrap(undefined as Maybe<number>)).toThrow();
});

test("bridge to Option", () => {
  expect(Maybe.toOption(undefined as Maybe<number>)).toBe(null);
  expect(Maybe.fromOption(null as number | null)).toBeUndefined();
});

test("mirrored combinators", () => {
  expect(Maybe.isSomeAnd(4, (n) => n > 0)).toBe(true);
  expect(Maybe.orElse(undefined as Maybe<number>, () => 5)).toBe(5);
  expect(Maybe.mapOrElse(undefined as Maybe<number>, () => "none", (n) => `some:${n}`)).toBe("none");
  expect(Maybe.xor(1, undefined as Maybe<number>)).toBe(1);
  expect(Maybe.zipWith(2, 3, (a, b) => a + b)).toBe(5);
  expect(Maybe.filterSome([1, undefined, 3])).toEqual([1, 3]);
  expect(Maybe.all([1, 2])).toEqual([1, 2]);
  expect(Maybe.all([1, undefined])).toBeUndefined();
  expect(Maybe.firstSome([undefined, 3])).toBe(3);
});

test("construction & Result bridge", () => {
  expect(Maybe.fromNullable<number>(null)).toBeUndefined();
  expect(Maybe.fromPredicate(5, (n) => n > 0)).toBe(5);
  expect(Maybe.okOr(5, "absent").unwrap()).toBe(5);
  expect(Maybe.okOr(undefined as Maybe<number>, "absent").unwrapErr()).toBe("absent");
});

test("Maybe.safeTry short-circuits on undefined", () => {
  const good = Maybe.safeTry(function* () {
    const a = yield* Maybe.safeUnwrap(2);
    return a + 1;
  });
  expect(good).toBe(3);
  const none = Maybe.safeTry(function* () {
    const a = yield* Maybe.safeUnwrap(undefined as Maybe<number>);
    return a + 1;
  });
  expect(none).toBeUndefined();
});
