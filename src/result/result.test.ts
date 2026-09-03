import { test, expect } from "bun:test";
import { Result, ok, err, Ok, Err } from "./result";

test("ok / err construct the right variant and narrow", () => {
  const good = ok<number, string>(42);
  const bad = err<string, number>("nope");
  expect(good.isOk()).toBe(true);
  expect(bad.isErr()).toBe(true);
  expect(good instanceof Ok).toBe(true);
  expect(bad instanceof Err).toBe(true);
  if (good.isOk()) expect(good.value).toBe(42);
  if (bad.isErr()) expect(bad.error).toBe("nope");
});

test("map / mapErr / mapBoth", () => {
  expect(ok(21).map((n) => n * 2).unwrap()).toBe(42);
  expect(err<string, number>("x").map((n) => n * 2).isErr()).toBe(true);
  expect(err<string, number>("x").mapErr((e) => e.toUpperCase()).unwrapErr()).toBe("X");
  expect(ok<number, string>(2).mapBoth((n) => n + 1, (e) => e).unwrap()).toBe(3);
});

test("andThen widens the error union and short-circuits", () => {
  const parse = (s: string): Result<number, "nan"> => {
    const n = Number(s);
    return Number.isNaN(n) ? err("nan") : ok(n);
  };
  const positive = (n: number): Result<number, "neg"> => (n > 0 ? ok(n) : err("neg"));

  const good = ok<string>("5").andThen(parse).andThen(positive);
  expect(good.unwrap()).toBe(5);

  const bad = ok<string>("-5").andThen(parse).andThen(positive);
  expect(bad.unwrapErr()).toBe("neg");

  const nan = ok<string>("abc").andThen(parse).andThen(positive);
  expect(nan.unwrapErr()).toBe("nan");
});

test("andThrough keeps the value when the side effect succeeds", () => {
  const check = (n: number): Result<boolean, "too-big"> => (n < 100 ? ok(true) : err("too-big"));
  expect(ok(10).andThrough(check).unwrap()).toBe(10);
  expect(ok(200).andThrough(check).unwrapErr()).toBe("too-big");
});

test("orElse recovers", () => {
  const recovered = err<string, number>("boom").orElse(() => ok<number>(0));
  expect(recovered.unwrap()).toBe(0);
});

test("filter turns a value into an error", () => {
  expect(ok(5).filter((n) => n > 0, "non-positive").unwrap()).toBe(5);
  expect(ok(-5).filter((n) => n > 0, "non-positive").unwrapErr()).toBe("non-positive");
  expect(ok(-5).filter((n) => n > 0, (n) => `bad:${n}`).unwrapErr()).toBe("bad:-5");
});

test("tap / tapErr observe without changing", () => {
  let seen = 0;
  const r = ok(7).tap((n) => {
    seen = n;
  });
  expect(seen).toBe(7);
  expect(r.unwrap()).toBe(7);
});

test("unwrap variants", () => {
  expect(ok<number, string>(1).unwrapOr(9)).toBe(1);
  expect(err<string, number>("e").unwrapOr(9)).toBe(9);
  expect(err<string, number>("e").unwrapOrElse((e) => e.length)).toBe(1);
  expect(() => err<string, number>("boom").unwrap("context")).toThrow("context: boom");
  expect(() => ok<number, string>(1).unwrapErr()).toThrow();
});

test("match", () => {
  const label = (r: Result<number, string>): string =>
    r.match((n) => `ok:${n}`, (e) => `err:${e}`);
  expect(label(ok(1))).toBe("ok:1");
  expect(label(err("x"))).toBe("err:x");
});

test("bridges to Option / Maybe / tuple", () => {
  expect(ok<number, string>(1).toOption()).toBe(1);
  expect(err<string, number>("e").toOption()).toBe(null);
  expect(err<string, number>("e").errToOption()).toBe("e");
  expect(err<string, number>("e").toMaybe()).toBeUndefined();
  expect(ok<number, string>(1).toTuple()).toEqual([1, null]);
  expect(err<string, number>("e").toTuple()).toEqual([null, "e"]);
});

test("Result.try / tryWithParser capture throws", () => {
  const parsed = Result.try(() => JSON.parse('{"a":1}') as { a: number });
  expect(parsed.isOk()).toBe(true);
  const failed = Result.try(() => JSON.parse("{bad") as unknown);
  expect(failed.isErr()).toBe(true);

  const safeParse = Result.tryWithParser(
    (s: string) => JSON.parse(s) as unknown,
    () => "bad-json" as const,
  );
  expect(safeParse("true").unwrap()).toBe(true);
  expect(safeParse("{bad").unwrapErr()).toBe("bad-json");
});

test("tryWithParser guard re-throws unmatched errors", () => {
  class Expected extends Error {}
  const wrapped = Result.tryWithParser(
    (fail: boolean) => {
      if (fail) throw new Expected("known");
      return "ok";
    },
    (e) => e,
    (e) => e instanceof Expected,
  );
  expect(wrapped(false).unwrap()).toBe("ok");
  expect(wrapped(true).isErr()).toBe(true);

  const unmatched = Result.tryWithParser(
    () => {
      throw new Error("unexpected");
    },
    (e) => e,
    (e) => e instanceof Expected,
  );
  expect(() => unmatched()).toThrow("unexpected");
});

test("Result.allResults / flatten", () => {
  expect(Result.allResults(ok<number, string>(1), ok<string, string>("a")).unwrap()).toEqual([1, "a"]);
  expect(Result.flatten(ok<Result<number, string>, string>(ok(5))).unwrap()).toBe(5);
  expect(Result.flatten(ok<Result<number, string>, string>(err("inner"))).unwrapErr()).toBe("inner");
  expect(Result.flatten(err<string, Result<number, string>>("outer")).unwrapErr()).toBe("outer");
});

test("Result.sequence / sequenceResults collect or fail fast", () => {
  const good = Result.sequence<number, string>([() => ok(1), () => 2, () => ok(3)]);
  expect(good.unwrap()).toEqual([1, 2, 3]);

  const bad = Result.sequence<number, string>([() => ok(1), () => err("stop"), () => ok(3)]);
  expect(bad.unwrapErr()).toBe("stop");

  expect(Result.sequenceResults<number, string>(() => ok(1), () => 2).unwrap()).toEqual([1, 2]);
});

test("Result.applyAll maps and fails fast", () => {
  const double = (n: number): Result<number, string> => (n > 0 ? ok(n * 2) : err("negative"));
  expect(Result.applyAll([1, 2, 3], double).unwrap()).toEqual([2, 4, 6]);
  expect(Result.applyAll([1, -1, 3], double).unwrapErr()).toBe("negative");
});

test("Result.fromNullable / fromOption / fromMaybe", () => {
  expect(Result.fromNullable(5, "absent").unwrap()).toBe(5);
  expect(Result.fromNullable(null, "absent").unwrapErr()).toBe("absent");
  expect(Result.fromNullable(undefined, () => "computed").unwrapErr()).toBe("computed");
  expect(Result.fromOption(3 as number | null, "none").unwrap()).toBe(3);
  expect(Result.fromMaybe(undefined as number | undefined, "none").unwrapErr()).toBe("none");
});

test("Result.all fails fast and preserves tuple positions", () => {
  const combined = Result.all([ok<number, string>(1), ok<string, string>("a")]);
  expect(combined.unwrap()).toEqual([1, "a"]);

  const failed = Result.all([ok<number, string>(1), err<string, number>("boom")]);
  expect(failed.unwrapErr()).toBe("boom");
});

test("Result.allOrErrors / partition / values / errors", () => {
  const rs = [ok<number, string>(1), err<string, number>("a"), ok<number, string>(2), err<string, number>("b")];
  expect(Result.allOrErrors(rs).unwrapErr()).toEqual(["a", "b"]);
  expect(Result.partition(rs)).toEqual([[1, 2], ["a", "b"]]);
  expect(Result.values(rs)).toEqual([1, 2]);
  expect(Result.errors(rs)).toEqual(["a", "b"]);
});

test("Result.is / parseError", () => {
  expect(Result.is(ok(1))).toBe(true);
  expect(Result.is(err(1))).toBe(true);
  expect(Result.is({ ok: true })).toBe(false);
  expect(Result.parseError("boom").message).toBe("boom");
  expect(Result.parseError(new Error("e")).message).toBe("e");
});
