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

test("mirrored combinators", () => {
  expect(Absent.isPresentAnd(4, (n) => n > 0)).toBe(true);
  expect(Absent.isAbsentOr(null as Absent<number>, (n) => n > 0)).toBe(true);
  expect(Absent.andThen(4, (n) => (n > 0 ? n : undefined))).toBe(4);
  expect(Absent.mapOrElse(null as Absent<number>, () => "none", (n) => `some:${n}`)).toBe("none");
  expect(Absent.filter(4, (n) => n > 10)).toBeUndefined();
  expect(Absent.firstPresent([null, undefined, 3])).toBe(3);
});

test("Result bridge: okOr / okOrElse", () => {
  expect(Absent.okOr(5, "absent").unwrap()).toBe(5);
  expect(Absent.okOr(null as Absent<number>, "absent").unwrapErr()).toBe("absent");
  expect(Absent.okOrElse(undefined as Absent<number>, () => "computed").unwrapErr()).toBe("computed");
});
