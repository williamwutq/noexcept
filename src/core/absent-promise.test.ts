import { test, expect } from "bun:test";
import { AbsentPromise } from "./absent-promise.js";
import type { Absent } from "./absent.js";

const present = (n: number): AbsentPromise<number> => Promise.resolve(n as Absent<number>);
const absent = (): AbsentPromise<number> => Promise.resolve(null as Absent<number>);

test("presence guards", async () => {
  expect(await AbsentPromise.isPresent(present(0))).toBe(true);
  expect(await AbsentPromise.isAbsent(absent())).toBe(true);
  expect(await AbsentPromise.isAbsent(Promise.resolve(undefined as Absent<number>))).toBe(true);
});

test("map / andThen / filter / mapOr", async () => {
  expect(await AbsentPromise.map(present(5), async (n) => n * 2)).toBe(10);
  expect(await AbsentPromise.map(absent(), (n) => n * 2)).toBeUndefined();
  expect(await AbsentPromise.andThen(present(4), (n) => (n > 0 ? n : undefined))).toBe(4);
  expect(await AbsentPromise.filter(present(4), async (n) => n > 10)).toBeUndefined();
  expect(await AbsentPromise.mapOr(absent(), 0, (n) => n + 1)).toBe(0);
});

test("unwrap / match / firstPresent", async () => {
  expect(await AbsentPromise.unwrapOr(absent(), 7)).toBe(7);
  expect(await AbsentPromise.match(present(1), (n) => `p:${n}`, () => "a")).toBe("p:1");
  expect(
    await AbsentPromise.firstPresent([absent(), Promise.resolve(undefined as Absent<number>), present(3)]),
  ).toBe(3);
});

test("bridges: okOr / toOption / toMaybe", async () => {
  expect((await AbsentPromise.okOr(present(5), "absent")).unwrap()).toBe(5);
  expect((await AbsentPromise.okOr(absent(), "absent")).unwrapErr()).toBe("absent");
  expect(await AbsentPromise.toOption(absent())).toBe(null);
  expect(await AbsentPromise.toMaybe(absent())).toBeUndefined();
});

test("AbsentPromise.safeTry short-circuits, preserving which absence", async () => {
  const good = await AbsentPromise.safeTry(async function* () {
    const a = yield* AbsentPromise.safeUnwrap(present(2));
    const b = yield* AbsentPromise.safeUnwrap(present(3));
    return a + b;
  });
  expect(good).toBe(5);

  const viaNull = await AbsentPromise.safeTry(async function* () {
    const a = yield* AbsentPromise.safeUnwrap(absent());
    return a + 1;
  });
  expect(viaNull).toBe(null);
});
