import { test, expect } from "bun:test";
import { Maybe } from "./maybe";

test("some / none / guards", () => {
  expect(Maybe.isSome(Maybe.some(1))).toBe(true);
  expect(Maybe.isNone(Maybe.none)).toBe(true);
  expect(Maybe.isSome(null)).toBe(true); // null is present; only undefined is absent
});

test("map / flatMap / unwrap", () => {
  expect(Maybe.map(21, (n) => n * 2)).toBe(42);
  expect(Maybe.map(undefined as Maybe<number>, (n) => n * 2)).toBeUndefined();
  expect(Maybe.flatMap(4, (n) => (n > 0 ? n : undefined))).toBe(4);
  expect(Maybe.unwrapOr(undefined as Maybe<number>, 7)).toBe(7);
  expect(() => Maybe.unwrap(undefined as Maybe<number>)).toThrow();
});

test("bridge to Option", () => {
  expect(Maybe.toOption(undefined as Maybe<number>)).toBe(null);
  expect(Maybe.fromOption(null as number | null)).toBeUndefined();
});
