import { test, expect } from "bun:test";
import { NonEmptyArray } from "./array";

test("parse / is", () => {
  expect(NonEmptyArray.is([])).toBe(false);
  expect(NonEmptyArray.is([1])).toBe(true);
  expect(NonEmptyArray.parse([])).toBe(null);
});

test("head / tail on a non-empty array", () => {
  const ne = NonEmptyArray.parse([1, 2, 3]);
  expect(ne).not.toBe(null);
  if (ne !== null) {
    expect(NonEmptyArray.head(ne)).toBe(1);
    expect(NonEmptyArray.tail(ne)).toEqual([2, 3]);
  }
});
