import { test, expect } from "bun:test";
import { EitherPromise } from "./either-promise";
import { main, alt } from "./either";
import { ok, err } from "../result/result";

test("main / alt are awaitable to an Either", async () => {
  const m = await EitherPromise.main<number, string>(42);
  const a = await EitherPromise.alt<string, number>("other");
  expect(m.unwrapMain()).toBe(42);
  expect(a.unwrapAlt()).toBe("other");
});

test("flip swaps sides asynchronously", async () => {
  const flipped = await EitherPromise.main<number, string>(1).flip();
  expect(flipped.unwrapAlt()).toBe(1);
  expect(await EitherPromise.flip(EitherPromise.alt<string, number>("x")).unwrapMain()).toBe("x");
});

test("symmetric map / mapAlt with async callbacks", async () => {
  expect((await EitherPromise.main<number, string>(21).map(async (n) => n * 2)).unwrapMain()).toBe(42);
  expect((await EitherPromise.main<number, string>(21).mapAlt((s) => s.length)).unwrapMain()).toBe(21);
  expect((await EitherPromise.alt<string, number>("ab").mapAlt(async (s) => s.length)).unwrapAlt()).toBe(2);
});

test("andThen / andThenAlt accept Either or EitherPromise", async () => {
  const chained = EitherPromise.main<number, string>(2)
    .andThen((n) => main<number, string>(n + 1)) // sync Either
    .andThen((n) => EitherPromise.main<number, string>(n * 10)); // EitherPromise
  expect((await chained).unwrapMain()).toBe(30);

  const onAlt = await EitherPromise.alt<string, number>("x").andThenAlt((s) => alt<string, number>(s + "!"));
  expect(onAlt.unwrapAlt()).toBe("x!");
});

test("mapBoth / match / defaults", async () => {
  expect((await EitherPromise.main<number, string>(2).mapBoth((n) => n + 1, (s) => s.length)).unwrapMain()).toBe(3);
  expect(await EitherPromise.main<number, string>(1).match((n) => `m:${n}`, (s) => `a:${s}`)).toBe("m:1");
  expect(await EitherPromise.alt<string, number>("x").mainOr(9)).toBe(9);
  expect(await EitherPromise.main<number, string>(1).altOption()).toBe(null);
});

test("tap / tapAlt observe the right side", async () => {
  let seenMain = 0;
  let seenAlt = "";
  await EitherPromise.main<number, string>(9).tap((n) => {
    seenMain = n;
  });
  await EitherPromise.alt<string, number>("z").tapAlt((s) => {
    seenAlt = s;
  });
  expect(seenMain).toBe(9);
  expect(seenAlt).toBe("z");
});

test("collection splitters over mixed inputs", async () => {
  const items = [
    main<number, string>(1),
    EitherPromise.alt<string, number>("a"),
    EitherPromise.main<number, string>(2),
    alt<string, number>("b"),
  ];
  expect(await EitherPromise.values(items)).toEqual([1, 2]);
  expect(await EitherPromise.alternatives(items)).toEqual(["a", "b"]);
  expect(await EitherPromise.partition(items)).toEqual([[1, 2], ["a", "b"]]);
});

test("EitherPromise.select chooses by condition, accepting values or promises", async () => {
  expect((await EitherPromise.select(true, 1, "x")).unwrapMain()).toBe(1);
  expect((await EitherPromise.select(false, 1, "x")).unwrapAlt()).toBe("x");
  expect(
    (await EitherPromise.select(true, Promise.resolve(5), Promise.resolve("y"))).unwrapMain(),
  ).toBe(5);
});

test("bridges with Result", async () => {
  expect((await EitherPromise.fromResult(ok<number, string>(5))).unwrapMain()).toBe(5);
  expect((await EitherPromise.fromResult(Promise.resolve(err<string, number>("e")))).unwrapAlt()).toBe("e");
  expect(await EitherPromise.main<number, string>(5).toResult().unwrap()).toBe(5);
  expect(await EitherPromise.alt<string, number>("e").toResult().unwrapErr()).toBe("e");
});
