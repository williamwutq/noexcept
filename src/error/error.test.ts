import { test, expect } from "bun:test";
import { errorObject, type ErrorObject } from "./error.js";
import { ErrorString } from "../refinement/string.js";
import type { Issue } from "../refinement/guard.js";

type ParseFailure =
  | ErrorObject<"invalid-json">
  | ErrorObject<"invalid-user", { readonly issues: ReadonlyArray<Issue> }>;

test("errorObject builds a tagged error with an ErrorString message", () => {
  const e: ParseFailure = errorObject("invalid-json", ErrorString.from("bad json"));
  expect(e.kind).toBe("invalid-json");
  expect(e.message).toBe("bad json" as never);
});

test("errorObject carries extra data", () => {
  const issues: ReadonlyArray<Issue> = [{ path: ["age"], message: "expected integer" }];
  const e = errorObject("invalid-user", ErrorString.from("bad user"), { issues });
  expect(e.kind).toBe("invalid-user");
  expect(e.issues).toEqual(issues);
});

test("the union narrows on kind", () => {
  const render = (e: ParseFailure): string =>
    e.kind === "invalid-user" ? `${e.message} (${String(e.issues.length)})` : e.message;
  expect(render(errorObject("invalid-json", ErrorString.from("x")))).toBe("x");
  expect(
    render(errorObject("invalid-user", ErrorString.from("y"), { issues: [] })),
  ).toBe("y (0)");
});
