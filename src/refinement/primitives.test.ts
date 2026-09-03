import { test, expect } from "bun:test";
import { Primitives } from "./primitives.js";
import { Refinement } from "./guard.js";
import { Default } from "./default.js";

test("String / Number / Boolean guards and defaults", () => {
  expect(Primitives.String.is("x")).toBe(true);
  expect(Primitives.String.is(1)).toBe(false);
  expect(Default.of(Primitives.String)).toBe("");

  expect(Primitives.Number.is(1.5)).toBe(true);
  expect(Primitives.Number.is(Number.NaN)).toBe(false);
  expect(Primitives.Number.is(Number.POSITIVE_INFINITY)).toBe(false);
  expect(Default.of(Primitives.Number)).toBe(0);

  expect(Primitives.Boolean.is(false)).toBe(true);
  expect(Primitives.Boolean.is(0)).toBe(false);
  expect(Default.of(Primitives.Boolean)).toBe(false);
});

test("Object / Array / Function", () => {
  expect(Primitives.Object.is({ a: 1 })).toBe(true);
  expect(Primitives.Object.is([])).toBe(false);
  expect(Primitives.Object.is(null)).toBe(false);
  expect(Default.of(Primitives.Object)).toEqual({});

  expect(Primitives.Array.is([1, "x"])).toBe(true);
  expect(Primitives.Array.is({})).toBe(false);
  expect(Default.of(Primitives.Array)).toEqual([]);
  // a fresh array/object each call
  expect(Default.of(Primitives.Array)).not.toBe(Default.of(Primitives.Array));

  expect(Primitives.Function.is(() => 0)).toBe(true);
  expect(Primitives.Function.is("f")).toBe(false);
  expect(Default.is(Primitives.Function)).toBe(false); // no default
});

test("parse is derived; primitives compose as Specs", () => {
  expect(Primitives.String.parse("x")).toBe("x");
  expect(Primitives.String.parse(1)).toBe(null);

  const Tags = Refinement.shape({ id: Primitives.Number, labels: Primitives.Array });
  expect(Tags.is({ id: 1, labels: ["a", "b"] })).toBe(true);
  expect(Tags.is({ id: 1, labels: "a" })).toBe(false);
});

test("Refinement.array() with no element accepts any array", () => {
  const AnyArray = Refinement.array();
  expect(AnyArray.is([1, "x", true])).toBe(true);
  expect(AnyArray.is([])).toBe(true);
  expect(AnyArray.is("x")).toBe(false);

  const AnyNonEmpty = Refinement.nonEmptyArray();
  expect(AnyNonEmpty.is([1])).toBe(true);
  expect(AnyNonEmpty.is([])).toBe(false);
});

test("Date / BigInt / Symbol", () => {
  expect(Primitives.Date.is(new Date())).toBe(true);
  expect(Primitives.Date.is(new Date("nonsense"))).toBe(false); // Invalid Date
  expect(Primitives.Date.is(0)).toBe(false);

  expect(Primitives.BigInt.is(1n)).toBe(true);
  expect(Primitives.BigInt.is(1)).toBe(false);
  expect(Default.of(Primitives.BigInt)).toBe(0n);

  expect(Primitives.Symbol.is(Symbol("x"))).toBe(true);
  expect(Primitives.Symbol.is("x")).toBe(false);
});
