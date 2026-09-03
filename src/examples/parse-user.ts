/**
 * Example — parse data crossing the client/server boundary, safely.
 *
 * The same refinements and the same error handling work in both directions,
 * because none of it depends on which side you are on:
 *
 *   - on the **frontend**, `parseUser` validates a fetched response body;
 *   - on the **backend**, the *same* `parseUser` validates a received request
 *     body.
 *
 * Nothing throws. A bad payload is a value you branch on, and a bad *field*
 * comes back with the path to it.
 *
 * Run it: `bun src/examples/parse-user.ts`
 */

import {
  Refinement,
  Integer,
  NonEmptyString,
  Result,
  ResultPromise,
  ErrorString,
  errorObject,
  type ErrorObject,
  type Issue,
  type Infer,
  type Brand,
} from "../index.js";

/* -------------------------------------------------------------------------- */
/*  1. Type construction — build the domain type out of refinements            */
/* -------------------------------------------------------------------------- */

/** A branded email string: a string matching the pattern, never anything else. */
type Email = Brand<string, "Email">;
const Email = Refinement.brand<"Email", string>(
  Refinement.matches(/^[^@\s]+@[^@\s]+\.[^@\s]+$/),
  "email",
);

/** The `User` refinement. `is` / `parse` / `decode` all come from this one value. */
const User = Refinement.shape({
  id: Integer,
  name: NonEmptyString,
  email: Email,
  roles: Refinement.array(Refinement.literal("admin", "user", "guest")),
});

/** The static type, derived from the refinement — no second source of truth. */
type User = Infer<typeof User>;
// { id: Integer; name: NonEmptyString; email: Email; roles: ("admin" | "user" | "guest")[] }

/* -------------------------------------------------------------------------- */
/*  2. One error type for the whole parse — network stays separate (below)     */
/* -------------------------------------------------------------------------- */

// A discriminated union of `ErrorObject`s: each has a `kind` and an
// `ErrorString` message; the invalid-user case also carries the field issues.
type ParseFailure =
  | ErrorObject<"invalid-json">
  | ErrorObject<"invalid-user", { readonly issues: ReadonlyArray<Issue> }>;

/* -------------------------------------------------------------------------- */
/*  3. The parser — unknown text in, `User` or a failure out. No throws.       */
/*     Symmetric: identical whether the text is a response or a request body.   */
/* -------------------------------------------------------------------------- */

function parseUser(payload: string): Result<User, ParseFailure> {
  return Result.try(() => JSON.parse(payload) as unknown)
    .mapErr((error): ParseFailure => errorObject("invalid-json", ErrorString.from(error)))
    .andThen((json) =>
      User.decode(json).mapErr((issues): ParseFailure =>
        errorObject("invalid-user", ErrorString.from("user validation failed"), { issues }),
      ),
    );
}

/* -------------------------------------------------------------------------- */
/*  4. Handle the outcome as a value                                           */
/* -------------------------------------------------------------------------- */

function describe(result: Result<User, ParseFailure>): string {
  return result.match(
    (user) => `✓ #${String(user.id)} ${user.name} <${user.email}> [${user.roles.join(", ")}]`,
    (failure) =>
      failure.kind === "invalid-json"
        ? `✗ ${failure.message}`
        : `✗ ${failure.message}:\n${failure.issues
            .map((issue) => `    ${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("\n")}`,
  );
}

/* -------------------------------------------------------------------------- */
/*  5. The async form for a real fetch — same parser, still no throws.         */
/*     Works from a browser or a server; a rejection becomes an Err.           */
/* -------------------------------------------------------------------------- */

type LoadError = ParseFailure | ErrorObject<"network">;

export function loadUser(url: string): ResultPromise<User, LoadError> {
  return ResultPromise.safeTry(async function* () {
    const response = yield* ResultPromise.fromPromise(
      fetch(url),
      (error): LoadError => errorObject("network", ErrorString.from(error)),
    );
    const body = yield* ResultPromise.fromPromise(
      response.text(),
      (error): LoadError => errorObject("network", ErrorString.from(error)),
    );
    return parseUser(body);
  });
}

/* -------------------------------------------------------------------------- */
/*  Runnable demo (no network needed) — three payloads as if freshly fetched   */
/* -------------------------------------------------------------------------- */

const good = '{ "id": 1, "name": "Ada", "email": "ada@example.com", "roles": ["admin", "user"] }';
const badFields = '{ "id": 1.5, "name": "", "email": "nope", "roles": ["root"] }';
const badJson = "{ not json";

console.log(describe(parseUser(good)));
console.log(describe(parseUser(badFields)));
console.log(describe(parseUser(badJson)));
