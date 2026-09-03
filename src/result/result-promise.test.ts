import { test, expect } from "bun:test";
import { ResultPromise } from "./result-promise";
import { ok, err, type Result } from "./result";

test("ResultPromise.ok / ResultPromise.err are awaitable to a Result", async () => {
  const good = await ResultPromise.ok<number, string>(42);
  const bad = await ResultPromise.err<string, number>("nope");
  expect(good.unwrap()).toBe(42);
  expect(bad.unwrapErr()).toBe("nope");
});

test("map / mapErr work before settling and may be async", async () => {
  const r = await ResultPromise.ok<number, string>(21).map(async (n) => n * 2);
  expect(r.unwrap()).toBe(42);
  const e = await ResultPromise.err<string, number>("x").mapErr((s) => s.toUpperCase());
  expect(e.unwrapErr()).toBe("X");
});

test("andThen accepts Result, ResultPromise, or Promise<Result>", async () => {
  const chain = ResultPromise.ok<number, string>(2)
    .andThen((n) => ok<number, string>(n + 1)) // sync Result
    .andThen((n) => ResultPromise.ok<number, string>(n * 10)) // ResultPromise
    .andThen((n) => Promise.resolve(ok<number, string>(n - 1))); // Promise<Result>
  expect((await chain).unwrap()).toBe(29);
});

test("andThen short-circuits on error", async () => {
  const chain = ResultPromise.err<string, number>("boom").andThen((n) => ResultPromise.ok<number, string>(n + 1));
  expect((await chain).unwrapErr()).toBe("boom");
});

test("orElse recovers asynchronously", async () => {
  const r = await ResultPromise.err<string, number>("down").orElse(() => ResultPromise.ok<number>(0));
  expect(r.unwrap()).toBe(0);
});

test("fromPromise maps a rejection into Err, never throws", async () => {
  const rejecting = Promise.reject(new Error("network"));
  const r = await ResultPromise.fromPromise(rejecting, (e) => (e instanceof Error ? e.message : "unknown"));
  expect(r.unwrapErr()).toBe("network");
});

test("fromPromise without a mapper wraps a resolved value in Ok", async () => {
  const r = await ResultPromise.fromPromise(Promise.resolve(7));
  expect(r.unwrap()).toBe(7);
});

test("try captures a thrown async error", async () => {
  const good = await ResultPromise.try(async () => 5);
  expect(good.unwrap()).toBe(5);
  const bad = await ResultPromise.try(async () => {
    throw new Error("boom");
  });
  expect(bad.isErr()).toBe(true);
});

test("match / unwrapOr settle the value", async () => {
  const labelled = await ResultPromise.ok<number, string>(1).match((n) => `ok:${n}`, (e) => `err:${e}`);
  expect(labelled).toBe("ok:1");
  expect(await ResultPromise.err<string, number>("e").unwrapOr(9)).toBe(9);
  expect(await ResultPromise.err<string, number>("e").unwrapOrElse((s) => s.length)).toBe(1);
});

test("ResultPromise.all fails fast over mixed inputs", async () => {
  const items: Array<Result<number, string> | ResultPromise<number, string>> = [
    ok<number, string>(1),
    ResultPromise.ok<number, string>(2),
  ];
  expect((await ResultPromise.all(items)).unwrap()).toEqual([1, 2]);

  const withErr = await ResultPromise.all([ResultPromise.ok<number, string>(1), ResultPromise.err<string, number>("boom")]);
  expect(withErr.unwrapErr()).toBe("boom");
});

test("tap / toOption", async () => {
  let seen = 0;
  const r = await ResultPromise.ok<number, string>(8).tap((n) => {
    seen = n;
  });
  expect(seen).toBe(8);
  expect(r.unwrap()).toBe(8);
  expect(await ResultPromise.err<string, number>("e").toOption()).toBe(null);
});

test("a sync Result crosses into async via asyncAndThen / asyncMap", async () => {
  const chained = await ok<number, string>(3).asyncAndThen((n) => ResultPromise.ok<number, string>(n + 1));
  expect(chained.unwrap()).toBe(4);

  const mapped = await ok<number, string>(3).asyncMap(async (n) => n * 2);
  expect(mapped.unwrap()).toBe(6);

  const short = await err<string, number>("boom").asyncMap(async (n) => n * 2);
  expect(short.unwrapErr()).toBe("boom");
});

test("ResultPromise.sequence runs steps in order, failing fast", async () => {
  const good = await ResultPromise.sequence<number, string>([
    async () => ok(1),
    () => 2,
    async () => ok(3),
  ]);
  expect(good.unwrap()).toEqual([1, 2, 3]);

  const bad = await ResultPromise.sequence<number, string>([
    async () => ok(1),
    async () => err("stop"),
    async () => ok(3),
  ]);
  expect(bad.unwrapErr()).toBe("stop");
});

test("ResultPromise.applyAll maps in parallel, failing fast", async () => {
  const double = (n: number): ResultPromise<number, string> =>
    n > 0 ? ResultPromise.ok(n * 2) : ResultPromise.err("negative");
  expect((await ResultPromise.applyAll([1, 2, 3], double)).unwrap()).toEqual([2, 4, 6]);
  expect((await ResultPromise.applyAll([1, -1, 3], double)).unwrapErr()).toBe("negative");
});

test("ResultPromise.fromResultOfPromise flips a Result holding a promise", async () => {
  const flipped = await ResultPromise.fromResultOfPromise(ok<Promise<number>, string>(Promise.resolve(9)));
  expect(flipped.unwrap()).toBe(9);

  const rejected = await ResultPromise.fromResultOfPromise(
    ok<Promise<number>, string>(Promise.reject(new Error("boom"))),
  );
  expect(rejected.isErr()).toBe(true);

  const already = await ResultPromise.fromResultOfPromise(err<string, Promise<number>>("outer"));
  expect(already.unwrapErr()).toBe("outer");
});

test("ported instance methods: mapBoth / andThrough / filter", async () => {
  expect((await ResultPromise.ok<number, string>(2).mapBoth((n) => n + 1, (e) => e)).unwrap()).toBe(3);
  expect(
    (await ResultPromise.err<string, number>("x").mapBoth((n) => n + 1, async (e) => e.toUpperCase())).unwrapErr(),
  ).toBe("X");

  const check = (n: number): ResultPromise<boolean, "too-big"> =>
    n < 100 ? ResultPromise.ok(true) : ResultPromise.err("too-big");
  expect((await ResultPromise.ok<number, string>(10).andThrough(check)).unwrap()).toBe(10);
  expect((await ResultPromise.ok<number, string>(200).andThrough(check)).unwrapErr()).toBe("too-big");

  expect((await ResultPromise.ok<number, string>(5).filter((n) => n > 0, "non-positive")).unwrap()).toBe(5);
  expect(
    (await ResultPromise.ok<number, string>(-5).filter(async (n) => n > 0, (n) => `bad:${n}`)).unwrapErr(),
  ).toBe("bad:-5");
});

test("ported instance methods: unwrapErr / errToOption / toMaybe / toTuple", async () => {
  expect(await ResultPromise.err<string, number>("e").unwrapErr()).toBe("e");
  expect(await ResultPromise.err<string, number>("e").errToOption()).toBe("e");
  expect(await ResultPromise.ok<number, string>(1).errToOption()).toBe(null);
  expect(await ResultPromise.err<string, number>("e").toMaybe()).toBeUndefined();
  expect(await ResultPromise.ok<number, string>(1).toTuple()).toEqual([1, null]);
  expect(await ResultPromise.err<string, number>("e").toTuple()).toEqual([null, "e"]);
});

test("ported statics: allResults / allOrErrors / partition / values / errors", async () => {
  expect(
    (await ResultPromise.allResults(ResultPromise.ok<number, string>(1), ResultPromise.ok<number, string>(2))).unwrap(),
  ).toEqual([1, 2]);

  const mixed = [
    ResultPromise.ok<number, string>(1),
    ResultPromise.err<string, number>("a"),
    ResultPromise.ok<number, string>(2),
    ResultPromise.err<string, number>("b"),
  ];
  expect((await ResultPromise.allOrErrors(mixed)).unwrapErr()).toEqual(["a", "b"]);
  expect(await ResultPromise.partition(mixed)).toEqual([[1, 2], ["a", "b"]]);
  expect(await ResultPromise.values(mixed)).toEqual([1, 2]);
  expect(await ResultPromise.errors(mixed)).toEqual(["a", "b"]);
});

test("ported statics: sequenceResults / tryWithParser", async () => {
  const seq = await ResultPromise.sequenceResults<number, string>(
    async () => ok(1),
    () => 2,
  );
  expect(seq.unwrap()).toEqual([1, 2]);

  class Expected extends Error {}
  const wrapped = ResultPromise.tryWithParser(
    (fail: boolean) => (fail ? Promise.reject(new Expected("known")) : Promise.resolve("ok")),
    (e) => e,
    (e) => e instanceof Expected,
  );
  expect((await wrapped(false)).unwrap()).toBe("ok");
  expect((await wrapped(true)).isErr()).toBe(true);

  const unmatched = ResultPromise.tryWithParser(
    () => Promise.reject(new Error("unexpected")),
    (e) => e,
    (e) => e instanceof Expected,
  );
  let caughtMessage: string | undefined;
  try {
    await unmatched();
  } catch (e) {
    caughtMessage = e instanceof Error ? e.message : String(e);
  }
  expect(caughtMessage).toBe("unexpected");
});
