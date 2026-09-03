import { test, expect } from "bun:test";
import { Default } from "./default.js";
import { Refinement, type Guard } from "./guard.js";

const isNumber: Guard<number> = (v): v is number => typeof v === "number";
const NonEmptyString = Refinement.brand<"NonEmptyString", string>(
  (v): v is string => typeof v === "string" && v.length > 0,
);

test("impl attaches a default; is asks of the type", () => {
  const Count = Default.impl(Refinement.of(isNumber), () => 0);
  expect(Default.is(Count)).toBe(true);
  expect(Default.of(Count)).toBe(0);

  // a plain refinement does not implement the trait
  expect(Default.is(Refinement.of(isNumber))).toBe(false);
  // ...nor does the non-empty string, which has no canonical start
  expect(Default.is(NonEmptyString)).toBe(false);
});

test("containers supply defaults their contents cannot", () => {
  const MaybeName = Default.option(NonEmptyString);
  expect(Default.is(MaybeName)).toBe(true);
  expect(Default.of(MaybeName)).toBe(null);
  expect(MaybeName.is(null)).toBe(true);
  expect(MaybeName.is("ada")).toBe(true);
  expect(MaybeName.is("")).toBe(false);

  const Names = Default.list(NonEmptyString);
  expect(Default.of(Names)).toEqual([]);
  // a fresh array each call — not one shared instance
  expect(Default.of(Names)).not.toBe(Default.of(Names));
  expect(Names.is(["ada", "grace"])).toBe(true);
  expect(Names.is(["ada", ""])).toBe(false);
});
