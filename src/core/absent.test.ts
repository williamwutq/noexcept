import { test, expect } from "bun:test";
import { Absent } from "./absent";

test("presence collapses both flavours of absence", () => {
  expect(Absent.isPresent(0)).toBe(true);
  expect(Absent.isPresent("")).toBe(true);
  expect(Absent.isAbsent(null)).toBe(true);
  expect(Absent.isAbsent(undefined)).toBe(true);
});

test("unwrap / map", () => {
  expect(Absent.unwrapOr(null as Absent<number>, 7)).toBe(7);
  expect(Absent.unwrapOr(undefined as Absent<number>, 7)).toBe(7);
  expect(Absent.map(5 as Absent<number>, (n) => n * 2)).toBe(10);
  expect(Absent.map(null as Absent<number>, (n) => n * 2)).toBeUndefined();
});

test("commit to one absence", () => {
  expect(Absent.toOption(undefined as Absent<number>)).toBe(null);
  expect(Absent.toMaybe(null as Absent<number>)).toBeUndefined();
});
