# Repository Coding Standards

Apply these standards for all implementation work in this repository.

## Core Principles
- Keep solutions simple and maintainable.
- Optimize for readability over cleverness.
- If requirements are unclear, ask the user instead of guessing.

## TypeScript and JavaScript Style
- Prefer interfaces over type aliases for object contracts.
- Keep interfaces close to the code that implements them.
- Prefer arrow functions (() => {}) over function declarations.
- Use clear, domain-meaningful names for variables, functions, and files.
- Avoid unnecessary abstractions and deep nesting.
- Prefer async and await over promises
- Avoid one line `if` statements (`if (x) return true;`)

## Project Structure
- Split code by primary responsibility.
- Use this repository structure:
  - src/modules for domain/business capabilities (auth, users, search, media, etc.)
  - src/web for page and route controllers (rendering, redirects, request/response concerns)
  - src/infrastructure for technical/shared concerns (database, cache, logging, events, jobs)
- Keep services close to their owning module. Do not create a global services folder.
- Create utilities folders only when helpers are truly shared across modules.
- Avoid mixing web page controller logic into domain modules.
- Domain services must not depend on web controllers or Express response rendering.

## Delivery Workflow Expectations
- Confirm feature scope before implementation if anything is ambiguous.
- After implementation, propose relevant unit tests and ask the user before writing them.
- Before marking work complete, run and pass:
  - type checks
  - lint checks
  - unit tests

## Completion Guidance
- Keep status updates compact and direct.
- When done, remind the user to:
  - manually test the feature
  - commit changes on a branch
