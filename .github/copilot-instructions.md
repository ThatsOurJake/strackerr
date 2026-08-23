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

## Project Structure
- Split code by primary responsibility.
- Place reusable helpers in a suitable utilities folder.
- Group files under clear directories by concern, such as:
  - utilities
  - services
  - data
  - routes

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
