import { test, expect } from "bun:test";
import { NonEmptyString } from "./string";

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
