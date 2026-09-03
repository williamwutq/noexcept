import { test, expect } from "bun:test";
import { Either, main, alt, Main, Alt } from "./either";
import { ok, err } from "../result/result";

test("main / alt construct the right side and narrow", () => {
  const m = main<number, string>(42);
  const a = alt<string, number>("other");
  expect(m.isMain()).toBe(true);
  expect(a.isAlt()).toBe(true);
  expect(m instanceof Main).toBe(true);
  expect(a instanceof Alt).toBe(true);
  if (m.isMain()) expect(m.value).toBe(42);
  if (a.isAlt()) expect(a.alternative).toBe("other");
});

test("flip swaps the two sides", () => {
  const flipped = main<number, string>(1).flip(); // Either<string, number>
  expect(flipped.isAlt()).toBe(true);
  expect(flipped.unwrapAlt()).toBe(1);

  // flip is symmetric: flipping twice is identity.
  expect(alt<string, number>("x").flip().flip().unwrapAlt()).toBe("x");

  // free-function form
  expect(Either.flip(main<number, string>(5)).unwrapAlt()).toBe(5);
});

test("symmetric map / andThen / tap", () => {
  expect(main<number, string>(21).map((n) => n * 2).unwrapMain()).toBe(42);
  expect(main<number, string>(21).mapAlt((s) => s.length).unwrapMain()).toBe(21); // main untouched
  expect(alt<string, number>("ab").mapAlt((s) => s.length).unwrapAlt()).toBe(2);
  expect(alt<string, number>("ab").map((n) => n * 2).unwrapAlt()).toBe("ab"); // alt untouched

  expect(main<number, string>(2).andThen((n) => main(n + 1)).unwrapMain()).toBe(3);
  expect(alt<string, number>("x").andThen((n) => main(n + 1)).unwrapAlt()).toBe("x");
  expect(alt<string, number>("x").andThenAlt((s) => alt(s.toUpperCase())).unwrapAlt()).toBe("X");

  let seenMain = 0;
  let seenAlt = "";
  main<number, string>(9).tap((n) => {
    seenMain = n;
  });
  alt<string, number>("z").tapAlt((s) => {
    seenAlt = s;
  });
  expect(seenMain).toBe(9);
  expect(seenAlt).toBe("z");
});

test("mapBoth / match", () => {
  expect(main<number, string>(2).mapBoth((n) => n + 1, (s) => s.length).unwrapMain()).toBe(3);
  const label = (e: Either<number, string>): string => e.match((n) => `main:${n}`, (s) => `alt:${s}`);
  expect(label(main(1))).toBe("main:1");
  expect(label(alt("x"))).toBe("alt:x");
});

test("unwrap / defaults / options", () => {
  expect(main<number, string>(1).mainOr(9)).toBe(1);
  expect(alt<string, number>("x").mainOr(9)).toBe(9);
  expect(alt<string, number>("x").altOr("d")).toBe("x");
  expect(main<number, string>(1).altOr("d")).toBe("d");
  expect(main<number, string>(1).mainOption()).toBe(1);
  expect(main<number, string>(1).altOption()).toBe(null);
  expect(() => main<number, string>(1).unwrapAlt()).toThrow();
});

test("symmetric collection splitters", () => {
  const es = [main<number, string>(1), alt<string, number>("a"), main<number, string>(2), alt<string, number>("b")];
  expect(Either.values(es)).toEqual([1, 2]);
  expect(Either.alternatives(es)).toEqual(["a", "b"]);
  expect(Either.partition(es)).toEqual([[1, 2], ["a", "b"]]);
});

test("bridges with Result", () => {
  expect(Either.fromResult(ok<number, string>(5)).unwrapMain()).toBe(5);
  expect(Either.fromResult(err<string, number>("e")).unwrapAlt()).toBe("e");
  expect(main<number, string>(5).toResult().unwrap()).toBe(5);
  expect(alt<string, number>("e").toResult().unwrapErr()).toBe("e");
});

test("Either.select chooses eagerly by condition", () => {
  expect(Either.select(true, 1, "x").unwrapMain()).toBe(1);
  expect(Either.select(false, 1, "x").unwrapAlt()).toBe("x");

  // both arguments are evaluated regardless of the condition
  let leftEvaluated = false;
  let rightEvaluated = false;
  const left = (() => {
    leftEvaluated = true;
    return 1;
  })();
  const right = (() => {
    rightEvaluated = true;
    return "x";
  })();
  Either.select(true, left, right);
  expect(leftEvaluated).toBe(true);
  expect(rightEvaluated).toBe(true);
});

test("Either.is", () => {
  expect(Either.is(main(1))).toBe(true);
  expect(Either.is(alt(1))).toBe(true);
  expect(Either.is({ value: 1 })).toBe(false);
});
