# noexcept

**Clear error handling and no exceptions, without any exceptions.**

A TypeScript library that represents missing values and failures as values in
the return type, rather than as thrown exceptions. No function here throws — a
function that can fail returns a value whose type includes the failure, and the
caller resolves it with an explicit check.

Zero runtime dependencies. Built and tested with [Bun](https://bun.sh).

## Overview

| Concern | Sync | Async | Shape |
| --- | --- | --- | --- |
| A value or its absence (`null`) | `Option<T>` | `OptionPromise<T>` | bare union + namespace |
| A value or its absence (`undefined`) | `Maybe<T>` | `MaybePromise<T>` | bare union + namespace |
| A value or either absence | `Absent<T>` | `AbsentPromise<T>` | bare union + namespace |
| A value or an error | `Result<T, E>` | `ResultPromise<T, E>` | wrapper class |
| One of two values (no error side) | `Either<T, A>` | `EitherPromise<T, A>` | wrapper class |
| Types that validate `unknown` | `Refinement<T>` (`Guard`, `Default`, `Primitives`) | | `{ is, parse, decode }` |
| Tagged errors | `ErrorObject`, `ErrorString` | | discriminated union |

Two representations, chosen to fit how each value is used. **Bare unions** are
the union itself (`Option<T>` *is* `T | null`) with a same-named namespace of
functions — free to construct, interchangeable with the unions the platform
already uses. **Wrappers** (`Result`, `Either`) are objects with fluent methods,
because carrying an error and chaining fallible steps reads better as a method
chain.

## Bare unions — `Option`, `Maybe`, `Absent`

`Option<T>` is `T | null`; `Maybe<T>` is `T | undefined`; `Absent<T>` is
`T | null | undefined`. `Option` and `Maybe` are separate so `null` and
`undefined` stay distinct; `Absent` covers both, for an input that uses either.

```ts
import { Option, Maybe } from "noexcept";

const port = Option.map(readPort(), (p) => p + 1); // number | null; unchanged when null
const name = Option.unwrapOr(findName(id), "anonymous");

Option.toMaybe(opt); // null -> undefined
Maybe.toOption(may); // undefined -> null
Option.okOr(opt, "missing"); // -> Result<T, "missing">
```

Each has `map`, `andThen`, `filter`, `match`, `unwrapOr`, `or`/`orElse`, `zip`,
`all`, `firstSome`, the guards `isSome`/`isNone`, and bridges to the others and
to `Result` (`okOr`). Their async twins (`OptionPromise` etc.) are
`Promise<Option<T>>` with the same functions, each async.

## `Result`, `ResultPromise`

`Result<T, E>` is a discriminated union of `Ok<T, E>` and `Err<T, E>`. A chain of
fallible steps composes, and `E` widens to the union of every step's error type.

```ts
import { ok, err, Result } from "noexcept";

function parsePort(text: string): Result<number, "not-a-number" | "out-of-range"> {
  const n = Number(text);
  if (Number.isNaN(n)) return err("not-a-number");
  if (n < 1 || n > 65535) return err("out-of-range");
  return ok(n);
}

const port = parsePort(input).map((n) => n + 1).unwrapOr(8080); // number; never throws

// wrap a throwing function; combine many, preserving tuple positions:
const parse = Result.tryWithParser((s: string) => JSON.parse(s) as unknown, toError);
Result.all([ok(1), ok("a")]); // Result<[number, string], never>

// JSON round-trip (Result is a class, so it has an explicit tagged form):
JSON.stringify(ok(1));           // {"ok":true,"value":1}
Result.fromJSON(parsed);          // Option<Result<unknown, unknown>>
```

`ResultPromise<T, E>` wraps `Promise<Result<T, E>>`, is awaitable to a `Result`,
and does not reject — a rejected promise becomes an `Err`.

```ts
const items = await ResultPromise.fromPromise(fetch(url), toError)
  .andThen(readJson)
  .map((body) => body.items)
  .unwrapOr([]);
```

## `Either`, `EitherPromise`

`Either<T, A>` is one of two values with **neither side privileged** — `A` is an
*alternative*, not an error, and nothing short-circuits. Every operation comes as
a symmetric pair, and `flip` swaps the sides.

```ts
import { main, alt, Either } from "noexcept";

main<number, string>(1).map((n) => n + 1);   // work the main side
alt<string, number>("x").mapAlt((s) => s.length);   // work the alternative side
Either.select(cond, left, right);             // both evaluated; true -> main, false -> alt
someEither.flip();                            // Either<T, A> -> Either<A, T>
Either.partition(list);                       // [T[], A[]]
```

## Do-notation — `safeTry`

Write a sequence of fallible steps as straight-line code; the first failure
short-circuits the whole block.

```ts
const result = Result.safeTry(function* () {
  const a = yield* parse(input);   // Result<number, ParseError> -> number, or bail
  const b = yield* positive(a);    // Result<number, RangeError> -> number, or bail
  return ok(a + b);                // Result<number, ParseError | RangeError>
});
```

Every fallible/absent type has one: `Result`/`Option`/`Maybe`/`Absent` (sync),
and `ResultPromise`/`OptionPromise`/`MaybePromise`/`AbsentPromise` (async, an
`async function*` — mix `yield* asyncStep` with `yield* Option.safeUnwrap(sync)`).

## Refinement types

A refinement is a `{ is, parse, decode }` value over `unknown`. You provide `is`
(a type guard); `parse` (`is(v) ? v : null`) and `decode` derive from it. Where
the type is branded, `is` narrows to the branded type, so the check cannot be
skipped.

```ts
import { Integer, NonEmptyString, Primitives, Refinement, type Infer } from "noexcept";

const User = Refinement.shape({
  name: NonEmptyString,
  age: Integer,
  tags: Refinement.array(Primitives.String),
});
type User = Infer<typeof User>; // { name: NonEmptyString; age: Integer; tags: string[] }

User.is(json);   // type guard, narrows json to User
User.parse(json); // Option<User>

// `decode` collects every failure with its path (not fail-fast):
User.decode({ name: "", age: 1.5, tags: [] }).unwrapErr();
// [ { path: ["name"], message: "expected non-empty string" },
//   { path: ["age"],  message: "expected integer" } ]
```

- **Combinators** (all build refinements): `of`, `brand`, `and`, `or`, `array`,
  `nonEmptyArray`, `shape`, `record`, `tuple`, `nullable`, `optional`, `literal`,
  `matches`, `instanceOf`.
- **`Primitives`**: `String`, `Number`, `Boolean`, `Object`, `Array`, `Function`,
  `Date`, `BigInt`, `Symbol`.
- **Branded leaves**: `Integer`, `PositiveInteger`, `NonNegativeInteger`,
  `NegativeInteger`, `SafeInteger`, `NonEmptyString`, `ErrorString`, plus the
  bounded-integer factories `integerAtLeast` / `integerAbove` / `integerAtMost` /
  `integerInRange`, and `NonEmptyArray`.
- **`Default`** is a separate opt-in trait for a canonical starting value
  (`Default.of(Integer)` is `0`; `Default.option` / `Default.list` supply
  `null` / `[]`).
- **Literal types** refine a numeric literal at compile time, no runtime cost:

  ```ts
  const die: IntegerRange<1, 7> = 6; // any of 1..6
  const bad: IntegerRange<1, 7> = 7; // compile error
  ```

## Errors — `ErrorObject`, `ErrorString`

Build a discriminated error union without the boilerplate. Each variant carries a
`kind` discriminant and an `ErrorString` message; messages are never a bare
`string`.

```ts
import { errorObject, ErrorString, type ErrorObject } from "noexcept";

type ParseFailure =
  | ErrorObject<"invalid-json">
  | ErrorObject<"invalid-user", { readonly issues: ReadonlyArray<Issue> }>;

errorObject("invalid-json", ErrorString.from(caught));        // { kind, message }
errorObject("invalid-user", ErrorString.from("bad"), { issues }); // + data

// ErrorString.from coerces anything (Error, string, …) to a non-empty message.
```

## Worked example

[`src/examples/parse-user.ts`](src/examples/parse-user.ts) parses data crossing
the client/server boundary: build a type from refinements, fetch and JSON-parse
without throwing, `decode` with field-level error paths, and handle the outcome
as a value. The same `parseUser` validates a **response body on the frontend**
and a **request body on the backend** — none of it depends on the side. Run it:

```sh
bun src/examples/parse-user.ts
```

## Scripts

```sh
bun test          # run the tests (a.test.ts sits next to a.ts)
bun run typecheck # tsc --noEmit
bun run lint      # eslint
bun run build     # emit dist/ with declarations
bun run check     # all of the above
```

## License

MIT © William Wu
