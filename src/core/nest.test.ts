import { test, expect } from "bun:test";
import { Option } from "./option.js";
import { Maybe } from "./maybe.js";
import { Absent } from "./absent.js";
import type { AllowsNull, AllowsUndefined, AllowsAbsent } from "./nest.js";

// Values whose declared type genuinely stays nullish at the call site. A `const`
// initialised with a literal would be control-flow-narrowed to the non-null
// type, hiding the very nesting under test — these functions defeat that.
const nullableStr = (): string | null => "x";
const undefStr = (): string | undefined => "x";

test("AllowsNull / AllowsUndefined / AllowsAbsent detect an already-nullish T", () => {
  // The annotations are the assertion: a wrong verdict is a compile error.
  const nullable: AllowsNull<string | null> = true;
  const plainForNull: AllowsNull<string> = false;
  const undef: AllowsUndefined<string | undefined> = true;
  const plainForUndef: AllowsUndefined<string> = false;
  const bothNull: AllowsAbsent<string | null> = true;
  const bothUndef: AllowsAbsent<string | undefined> = true;
  const plainForAbsent: AllowsAbsent<string> = false;
  expect([nullable, plainForNull, undef, plainForUndef, bothNull, bothUndef, plainForAbsent]).toEqual([
    true,
    false,
    true,
    false,
    true,
    true,
    false,
  ]);
});

test("Option.some / map accept a non-nullish value and reject a nullish one", () => {
  expect(Option.some(3)).toBe(3);
  expect(Option.map(3 as Option<number>, (n) => n + 1)).toBe(4);

  // @ts-expect-error value already admits null; Option<T> would collapse.
  expect(Option.some(nullableStr())).toBe("x");

  // @ts-expect-error fn returns an Option; map would nest — use andThen.
  expect(Option.map(3 as Option<number>, (n) => (n > 0 ? n : null))).toBe(3);

  // andThen is the sanctioned flatten for an option-returning fn — no error.
  expect(Option.andThen(3 as Option<number>, (n) => (n > 0 ? n : null))).toBe(3);
});

test("Maybe.some / map accept a non-nullish value and reject an undefined-admitting one", () => {
  expect(Maybe.some(3)).toBe(3);

  // @ts-expect-error value already admits undefined; Maybe<T> would collapse.
  expect(Maybe.some(undefStr())).toBe("x");

  // @ts-expect-error fn returns a Maybe; map would nest — use andThen.
  expect(Maybe.map(3 as Maybe<number>, (n) => (n > 0 ? n : undefined))).toBe(3);

  // A null-admitting value is fine for Maybe — null is a value here, not absence.
  expect(Maybe.some(nullableStr())).not.toBeUndefined();
});

test("Absent.map / fromPredicate reject a value that admits either absence", () => {
  // @ts-expect-error fn returns a nullable; Absent would nest — use andThen.
  expect(Absent.map(3 as Absent<number>, (n) => (n > 0 ? n : null))).toBe(3);

  // @ts-expect-error fn returns an undefined-admitting value; Absent would nest.
  expect(Absent.map(3 as Absent<number>, (n) => (n > 0 ? n : undefined))).toBe(3);

  // @ts-expect-error value already admits null; Absent<T> would collapse.
  expect(Absent.fromPredicate(nullableStr(), (s) => s !== null)).not.toBeUndefined();

  // @ts-expect-error value already admits undefined; Absent<T> would collapse.
  expect(Absent.fromPredicate(undefStr(), (s) => s !== undefined)).not.toBeUndefined();
});
