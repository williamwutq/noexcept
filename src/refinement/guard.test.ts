import { test, expect } from "bun:test";
import { Refinement, type Guard } from "./guard";
import type { Brand } from "./nominal";

test("of derives parse from is (non-transformative)", () => {
  const isString: Guard<string> = (v): v is string => typeof v === "string";
  const Str = Refinement.of(isString);
  expect(Str.is("x")).toBe(true);
  expect(Str.is(1)).toBe(false);
  expect(Str.parse("x")).toBe("x"); // hands back exactly what it was given
  expect(Str.parse(1)).toBe(null);
});

test("brand relabels the output type; parse still returns the value", () => {
  const Email = Refinement.brand<"Email", string>(Refinement.matches(/^[^@]+@[^@]+$/));
  const parsed = Email.parse("a@b.com");
  expect(parsed).toBe("a@b.com" as Brand<string, "Email">);
  expect(Email.parse("nope")).toBe(null);
});

test("and / or", () => {
  const isNumber: Guard<number> = (v): v is number => typeof v === "number";
  const positive: Guard<number> = (v): v is number => typeof v === "number" && v > 0;
  const Pos = Refinement.and(isNumber, positive);
  expect(Pos.is(3)).toBe(true);
  expect(Pos.is(-3)).toBe(false);

  const StrOrNum = Refinement.or(
    (v): v is string => typeof v === "string",
    isNumber,
  );
  expect(StrOrNum.is("x")).toBe(true);
  expect(StrOrNum.is(1)).toBe(true);
  expect(StrOrNum.is(true)).toBe(false);
});

test("array / nonEmptyArray", () => {
  const Nums = Refinement.array((v): v is number => typeof v === "number");
  expect(Nums.is([1, 2, 3])).toBe(true);
  expect(Nums.is([])).toBe(true);
  expect(Nums.is([1, "x"])).toBe(false);

  const NonEmpty = Refinement.nonEmptyArray((v): v is number => typeof v === "number");
  expect(NonEmpty.is([1])).toBe(true);
  expect(NonEmpty.is([])).toBe(false);
});

test("shape checks each field, ignores extras, returns the value", () => {
  const Point = Refinement.shape({
    x: (v): v is number => typeof v === "number",
    y: (v): v is number => typeof v === "number",
  });
  const value = { x: 1, y: 2, z: 3 };
  expect(Point.is(value)).toBe(true);
  expect(Point.parse(value)).toBe(value); // same object, extras intact
  expect(Point.is({ x: 1 })).toBe(false);
  expect(Point.is(null)).toBe(false);
  expect(Point.is([1, 2])).toBe(false);
});

test("nullable / optional keep null and undefined apart", () => {
  const str: Guard<string> = (v): v is string => typeof v === "string";
  expect(Refinement.nullable(str).is(null)).toBe(true);
  expect(Refinement.nullable(str).is(undefined)).toBe(false);
  expect(Refinement.optional(str).is(undefined)).toBe(true);
  expect(Refinement.optional(str).is(null)).toBe(false);
});

test("literal / matches / instanceOf", () => {
  const Dir = Refinement.literal("north", "south", "east", "west");
  expect(Dir.is("north")).toBe(true);
  expect(Dir.is("up")).toBe(false);

  expect(Refinement.matches(/^\d+$/).is("123")).toBe(true);
  expect(Refinement.matches(/^\d+$/).is("12a")).toBe(false);

  const Err = Refinement.instanceOf(Error);
  expect(Err.is(new Error("x"))).toBe(true);
  expect(Err.is("x")).toBe(false);
});

test("composed shape over branded fields", () => {
  const Email = Refinement.brand<"Email", string>(Refinement.matches(/^[^@]+@[^@]+$/));
  const User = Refinement.shape({
    name: (v): v is string => typeof v === "string" && v.length > 0,
    email: Email,
  });
  expect(User.is({ name: "ada", email: "a@b.com" })).toBe(true);
  expect(User.is({ name: "ada", email: "nope" })).toBe(false);
  expect(User.is({ name: "", email: "a@b.com" })).toBe(false);
});

test("record: arbitrary keys, one value type", () => {
  const Scores = Refinement.record((v): v is number => typeof v === "number");
  expect(Scores.is({ a: 1, b: 2 })).toBe(true);
  expect(Scores.is({})).toBe(true);
  expect(Scores.is({ a: 1, b: "x" })).toBe(false);
  expect(Scores.is([1, 2])).toBe(false);
  expect(Scores.is(null)).toBe(false);
});

test("tuple: fixed length, per-position specs", () => {
  const Pair = Refinement.tuple([
    (v): v is string => typeof v === "string",
    (v): v is number => typeof v === "number",
  ]);
  expect(Pair.is(["a", 1])).toBe(true);
  expect(Pair.is(["a", "b"])).toBe(false);
  expect(Pair.is(["a"])).toBe(false); // wrong length
  expect(Pair.is(["a", 1, 2])).toBe(false);
  const parsed = Pair.parse(["a", 1]);
  expect(parsed).toEqual(["a", 1]);
});
