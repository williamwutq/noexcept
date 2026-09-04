/**
 * Compile-time guards against nesting a bare-union absence type inside itself.
 *
 * Because the absence types are literal unions, a nested one collapses:
 * `Option<Option<T>>` is `(T | null) | null`, i.e. `Option<T>` — the outer and
 * inner `null` are the same value, and a "present-but-absent" case is lost. The
 * two types are indistinguishable to the compiler, so this cannot be caught on
 * the alias. It is caught instead at the boundaries where a concrete value type
 * is known — the constructors and `map` — by these guards.
 *
 * Each guard resolves to the value type `T` when `T` does not already admit the
 * container's absence sentinel, and to a {@link NestError} otherwise. A
 * `NestError` carries no real value, so the offending argument fails to
 * typecheck, and the message string is visible in the error.
 *
 * @module core/nest
 */

/* -------------------------------------------------------------------------- */
/*  Detection                                                                 */
/* -------------------------------------------------------------------------- */

/** `true` when `T` already admits `null` (so `Option<T>` would collapse). */
export type AllowsNull<T> = [null] extends [T] ? true : false;

/** `true` when `T` already admits `undefined` (so `Maybe<T>` would collapse). */
export type AllowsUndefined<T> = [undefined] extends [T] ? true : false;

/** `true` when `T` already admits `null` or `undefined` (so `Absent<T>` would collapse). */
export type AllowsAbsent<T> = [null | undefined] extends [T]
  ? true
  : [null] extends [T]
    ? true
    : [undefined] extends [T]
      ? true
      : false;

/* -------------------------------------------------------------------------- */
/*  Enforcement                                                               */
/* -------------------------------------------------------------------------- */

declare const nestError: unique symbol;

/**
 * A phantom type standing in for a nesting mistake. No value inhabits it, so an
 * argument required to be one is rejected; `M` names the mistake in the error.
 *
 * @template M A message describing the nesting that was refused.
 */
export interface NestError<M extends string> {
  readonly [nestError]: M;
}

/** `T` unless it already admits `null`, in which case a {@link NestError}. */
export type NoNestOption<T> = AllowsNull<T> extends true
  ? NestError<"value already admits null; Option<T> would collapse — use andThen to flatten">
  : T;

/** `T` unless it already admits `undefined`, in which case a {@link NestError}. */
export type NoNestMaybe<T> = AllowsUndefined<T> extends true
  ? NestError<"value already admits undefined; Maybe<T> would collapse — use andThen to flatten">
  : T;

/** `T` unless it already admits `null` or `undefined`, in which case a {@link NestError}. */
export type NoNestAbsent<T> = AllowsAbsent<T> extends true
  ? NestError<"value already admits null/undefined; Absent<T> would collapse — use andThen to flatten">
  : T;

/*
 * Trailing rest-parameter guards, for a *value* parameter whose type `T` is
 * inferred nakedly. (Intersecting the value type directly — `value: T &
 * NoNestOption<T>` — is unreliable: inference strips the sentinel from the
 * union before the check runs, so the nesting slips through. A trailing tuple
 * that is required only in the bad case does not disturb the inference of `T`.)
 * An empty tuple adds no argument; a one-element tuple makes the call require a
 * value no caller can supply, so the offending call fails to typecheck.
 */

/** No extra argument unless `T` admits `null`, in which case one that cannot be supplied. */
export type NoNestOptionArg<T> = AllowsNull<T> extends true
  ? [nestingError: NestError<"value already admits null; Option<T> would collapse — use andThen to flatten">]
  : [];

/** No extra argument unless `T` admits `undefined`, in which case one that cannot be supplied. */
export type NoNestMaybeArg<T> = AllowsUndefined<T> extends true
  ? [nestingError: NestError<"value already admits undefined; Maybe<T> would collapse — use andThen to flatten">]
  : [];

/** No extra argument unless `T` admits `null`/`undefined`, in which case one that cannot be supplied. */
export type NoNestAbsentArg<T> = AllowsAbsent<T> extends true
  ? [nestingError: NestError<"value already admits null/undefined; Absent<T> would collapse — use andThen to flatten">]
  : [];
