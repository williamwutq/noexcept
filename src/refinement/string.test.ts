import { test, expect } from "bun:test";
import { NonEmptyString, ErrorString } from "./string.js";

test("parse / is", () => {
  expect(NonEmptyString.parse("")).toBe(null);
  expect(NonEmptyString.parse("a")).toBe("a" as never);
  expect(NonEmptyString.is("")).toBe(false);
  expect(NonEmptyString.is("a")).toBe(true);
});

test("trimmed drops whitespace-only", () => {
  expect(NonEmptyString.trimmed("  ada  ")).toBe("ada" as never);
  expect(NonEmptyString.trimmed("   ")).toBe(null);
});

test("ErrorString: a non-empty string, never an object", () => {
  expect(ErrorString.is("boom")).toBe(true);
  expect(ErrorString.is("")).toBe(false);
  expect(ErrorString.is(42)).toBe(false);
  expect(ErrorString.is({ message: "boom" })).toBe(false);
  expect(ErrorString.is(new Error("boom"))).toBe(false); // an object, not a string
  expect(ErrorString.parse("boom")).toBe("boom" as never);
  expect(ErrorString.parse("")).toBe(null);
  expect(ErrorString.decode(1).unwrapErr()).toEqual([{ path: [], message: "expected error string" }]);
});

test("ErrorString.from coerces anything to a non-empty error string", () => {
  expect(ErrorString.from("boom")).toBe("boom" as never);
  expect(ErrorString.from(new Error("kaboom"))).toBe("kaboom" as never);
  expect(ErrorString.from("")).toBe("unknown error" as never);
  expect(ErrorString.from(42)).toBe("42" as never);
  // still a full refinement:
  expect(ErrorString.is("x")).toBe(true);
});
