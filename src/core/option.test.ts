import { test, expect } from "bun:test";
import { Option } from "./option";

test("some / none / guards", () => {
  expect(Option.isSome(Option.some(42))).toBe(true);
  expect(Option.isNone(Option.none)).toBe(true);
  expect(Option.isSome(0)).toBe(true); // zero is present
});

test("map / flatMap / filter leave none untouched", () => {
  expect(Option.map(21, (n) => n * 2)).toBe(42);
  expect(Option.map(null as Option<number>, (n) => n * 2)).toBe(null);
  expect(Option.flatMap(4, (n) => (n > 0 ? n : null))).toBe(4);
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
