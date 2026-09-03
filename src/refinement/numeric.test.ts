import { test, expect } from "bun:test";
import {
  Integer,
  PositiveInteger,
  NonNegativeInteger,
  NegativeInteger,
  type IntegerBelow,
  type IntegerRange,
  type PositiveIntegerUpTo,
} from "./numeric";
import { Refinement } from "./guard";
import { Default } from "./default";

// A refined value is still a `number` at runtime; drop the brand for equality.
const raw = (value: number | null): number | null => value;

test("Integer.parse returns an Option and validates from unknown", () => {
  expect(raw(Integer.parse(3))).toBe(3);
  expect(raw(Integer.parse(3.5))).toBe(null);
  expect(Integer.is(3)).toBe(true);
  expect(Integer.is(Number.NaN)).toBe(false);
  // now an `unknown`-input guard: non-numbers are refused, not a type error
  expect(Integer.is("3")).toBe(false);
  expect(Integer.parse("3")).toBe(null);
});

test("Integer / NonNegativeInteger carry a Default of 0; others do not", () => {
  expect(Default.is(Integer)).toBe(true);
  expect(raw(Default.of(Integer))).toBe(0);
  expect(Default.is(NonNegativeInteger)).toBe(true);
  expect(raw(Default.of(NonNegativeInteger))).toBe(0);
  expect(Default.is(PositiveInteger)).toBe(false);
  expect(Default.is(NegativeInteger)).toBe(false);
});

test("refinements compose as Specs", () => {
  const Point = Refinement.shape({ x: Integer, y: Integer });
  expect(Point.is({ x: 1, y: 2 })).toBe(true);
  expect(Point.is({ x: 1, y: 2.5 })).toBe(false);

  const Counts = Refinement.array(NonNegativeInteger);
  expect(Counts.is([0, 1, 2])).toBe(true);
  expect(Counts.is([0, -1])).toBe(false);
});

test("sign-refined integers", () => {
  expect(raw(PositiveInteger.parse(0))).toBe(null);
  expect(raw(PositiveInteger.parse(1))).toBe(1);
  expect(raw(NonNegativeInteger.parse(0))).toBe(0);
  expect(raw(NonNegativeInteger.parse(-1))).toBe(null);
  expect(raw(NegativeInteger.parse(-1))).toBe(-1);
  expect(raw(NegativeInteger.parse(0))).toBe(null);
});

test("literal ranges are compile-time unions", () => {
  const die: IntegerRange<1, 7> = 6; // 1..6
  const bit: IntegerBelow<2> = 1; // 0 | 1
  const upTo: PositiveIntegerUpTo<3> = 3; // 1 | 2 | 3
  expect(die).toBe(6);
  expect(bit).toBe(1);
  expect(upTo).toBe(3);

  // @ts-expect-error 7 is out of range for a six-sided die (1..6).
  const bad: IntegerRange<1, 7> = 7;
  expect(raw(bad)).toBe(7);

  // @ts-expect-error 0 is not a positive integer.
  const bad2: PositiveIntegerUpTo<3> = 0;
  expect(raw(bad2)).toBe(0);
});
