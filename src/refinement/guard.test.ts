import { test, expect } from "bun:test";
import { Refinement, type Guard } from "./guard.js";
import type { Brand } from "./nominal.js";
import { Primitives } from "./primitives.js";
import { Integer } from "./numeric.js";

test("of derives parse from is (non-transformative)", () => {
  const isString: Guard<string> = (v): v is string => typeof v === "string";
  const Str = Refinement.of(isString);
  expect(Str.is("x")).toBe(true);
  expect(Str.is(1)).toBe(false);
  expect(Str.parse("x")).toBe("x"); // returns the value unchanged
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

test("decode: leaf returns the value or one labelled issue", () => {
  expect(Integer.decode(3).unwrap()).toBe(3 as never);
  const bad = Integer.decode(3.5);
  expect(bad.isErr()).toBe(true);
  expect(bad.unwrapErr()).toEqual([{ path: [], message: "expected integer" }]);
});

test("decode: shape collects every failing field with its path", () => {
  const User = Refinement.shape({
    name: Primitives.String,
    age: Integer,
    email: Refinement.matches(/^[^@]+@[^@]+$/),
  });

  expect(User.decode({ name: "ada", age: 36, email: "a@b.com" }).isOk()).toBe(true);

  const issues = User.decode({ name: 1, age: 3.5, email: "nope" }).unwrapErr();
  expect(issues).toEqual([
    { path: ["name"], message: "expected string" },
    { path: ["age"], message: "expected integer" },
    { path: ["email"], message: "expected string matching ^[^@]+@[^@]+$" },
  ]);

  // a non-object fails at the root
  expect(User.decode(null).unwrapErr()).toEqual([{ path: [], message: "expected object" }]);
});

test("decode: nested paths through shape / array / record / tuple", () => {
  const Team = Refinement.shape({
    lead: Refinement.shape({ id: Integer }),
    members: Refinement.array(Integer),
    scores: Refinement.record(Integer),
    pair: Refinement.tuple([Primitives.String, Integer]),
  });

  const issues = Team.decode({
    lead: { id: 1.5 },
    members: [1, 2.5, 3],
    scores: { a: 1, b: 2.5 },
    pair: ["x", 4.5],
  }).unwrapErr();

  expect(issues).toEqual([
    { path: ["lead", "id"], message: "expected integer" },
    { path: ["members", 1], message: "expected integer" },
    { path: ["scores", "b"], message: "expected integer" },
    { path: ["pair", 1], message: "expected integer" },
  ]);
});

test("decode: nullable / optional skip their absence", () => {
  const R = Refinement.shape({ a: Refinement.nullable(Integer), b: Refinement.optional(Integer) });
  expect(R.decode({ a: null, b: undefined }).isOk()).toBe(true);
  expect(R.decode({ a: 1, b: 2 }).isOk()).toBe(true);
  expect(R.decode({ a: 1.5, b: 2 }).unwrapErr()).toEqual([
    { path: ["a"], message: "expected integer" },
  ]);
});
