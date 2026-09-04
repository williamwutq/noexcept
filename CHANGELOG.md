# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `formats` module of branded domain types: `Email`, `Url`, `Uuid`, `Ipv4` / `Ipv6` / `Ip`, `HexColor`, `Slug`, `Base64` / `Base64Url`, `HexString`, `SemVer`, `DateString` / `TimeString` / `DateTimeString`, `Port`, `Byte`, `Percentage`, `Latitude`, `Longitude`. Web types follow HTML5/WHATWG semantics, not RFC/ISO.
- Bounded-number factories `numberAtLeast` / `numberAbove` / `numberAtMost` / `numberBelow` / `numberInRange` (finite floats), alongside the existing integer factories.
- Nesting safety for the bare unions: `some`, `fromPredicate`, and `map` reject a value type that already admits the container's absence (`Option<Option<T>>` no longer collapses silently; a nesting `map` steers to `andThen`). Detection predicates `AllowsNull`, `AllowsUndefined`, `AllowsAbsent` exported.
