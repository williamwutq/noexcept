# noexcept

**Clear error handling and no exceptions, without any exceptions.**

A TypeScript library that represents missing values and failures as values in
the return type, rather than as thrown exceptions. No function in this library
throws. A function that can fail returns a value whose type includes the
failure, and the caller resolves that failure with an explicit check.

Zero runtime dependencies. Built and tested with [Bun](https://bun.sh).

## The types

There are two shapes, chosen to fit how each value is used.

### Bare unions — `Option`, `Maybe`, `Absent`

A value or its absence, with no wrapper. `Option<T>` is exactly `T | null`,
`Maybe<T>` is exactly `T | undefined`. Read one with an `x === null` check, pass
it to any function that accepts `T | null` or `T | undefined`, or use the helper
functions for longer chains.

```ts
import { Option, Maybe } from "noexcept";

const port = Option.map(readPort(), (p) => p + 1); // number | null; unchanged when null
const name = Option.unwrapOr(findName(id), "anonymous");

Option.toMaybe(opt); // null -> undefined
Maybe.toOption(may); // undefined -> null
```

`Option` and `Maybe` are separate types so that `null` and `undefined` stay
distinct. `Absent<T>` (`T | null | undefined`) covers both, for an input that
uses either.

### Wrappers — `Result`, `ResultPromise`

A value or an error. `Result<T, E>` is an object with methods, so a sequence of
fallible steps chains in order, and the error type widens to the union of every
step's error type.

```ts
import { ok, err, Result } from "noexcept";

function parsePort(text: string): Result<number, "not-a-number" | "out-of-range"> {
  const n = Number(text);
  if (Number.isNaN(n)) return err("not-a-number");
  if (n < 1 || n > 65535) return err("out-of-range");
  return ok(n);
}

const port = parsePort(input)
  .map((n) => n + 1)
  .unwrapOr(8080); // number; does not throw

// Convert a throwing function into one that returns a Result:
const parse = Result.tryWithParser(
  (s: string) => JSON.parse(s) as unknown,
  (e) => (e instanceof Error ? e.message : "parse error"),
);
parse("{bad").isErr(); // true

// Combine many; return the first error, and preserve tuple positions:
Result.all([ok(1), ok("a")]); // Result<[number, string], never>
```

`ResultPromise<T, E>` provides the same methods for asynchronous work. It wraps
a `Promise<Result<T, E>>`, resolves to a `Result` when awaited, and does not
reject; a rejected promise resolves to an `Err`.

```ts
import { ResultPromise } from "noexcept";

const items = await ResultPromise.fromPromise(fetch(url), toError)
  .andThen(readJson)      // this step returns a ResultPromise
  .map((body) => body.items)
  .unwrapOr([]);
```

Each converts to the other and to `Option`/`Maybe`: `result.toOption()`,
`result.toPromise()`, `Result.fromOption(opt, error)`.

### Refinement types

Types that record a runtime check. The branded types refine a runtime value:

```ts
import { Integer, PositiveInteger, NonEmptyString, NonEmptyArray } from "noexcept";

Integer.parse(3.5);             // null
PositiveInteger.parse(1);       // 1, typed as PositiveInteger
NonEmptyString.trimmed("  a "); // "a", or null when only whitespace

const first = NonEmptyArray.head(list); // return type is T, not T | undefined
```

The literal types refine a numeric literal at compile time, with no runtime
cost:

```ts
import type { IntegerRange } from "noexcept";

const die: IntegerRange<1, 7> = 6; // any of 1..6
const bad: IntegerRange<1, 7> = 7; // compile error
```

## Scripts

```sh
bun test          # run the tests (a.test.ts sits next to a.ts)
bun run typecheck # tsc --noEmit
bun run lint      # eslint
bun run build     # emit dist/ with declarations
bun run check     # all of the above
```

## Status

Implemented: `Option`, `Maybe`, `Absent` and their async twins
`OptionPromise` / `MaybePromise` / `AbsentPromise`; `Result` and `ResultPromise`;
`Either` (a symmetric two-sided value, neither side an error); and the
refinement types. Planned: further refinements.

## License

MIT © William Wu
