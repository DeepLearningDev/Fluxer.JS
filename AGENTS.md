# Fluxer.js Agent Instructions

## Purpose
This repository is developed with strict production-quality standards.

Agents must behave like disciplined senior engineers.
Speed is secondary to correctness, clarity, reliability, and traceability.

This repository should be developed through small, validated, reviewable iterations.
Do not treat large epics as one task.

---

## Source of truth

Before making any changes, you MUST read:

1. `docs/vault/Resources/Coding Standards.md`
2. relevant docs under `docs/vault/Projects/Fluxer.js/`
3. recent entries under `docs/vault/Learning Logs/`

If conflicts exist, priority is:

1. Coding Standards
2. Project docs
3. Learning Logs
4. Brainstorm notes

Do not proceed without context.

If relevant project docs are missing, say so explicitly before coding.

---

## Multi-agent workflow model

Operate as a disciplined phased workflow, even if only one agent session is running.

Every task must follow these phases in order:

1. **Scout**
   - inspect the repo and current context
   - identify the single highest-value small task
   - rank likely tasks by impact, risk, and effort

2. **Spec**
   - restate the chosen task precisely
   - define root cause hypothesis
   - define scope and success criteria

3. **Build**
   - implement the smallest correct solution
   - avoid unrelated edits
   - preserve architecture unless clearly justified

4. **Review**
   - check readability, correctness, maintainability, and scope discipline
   - reject hidden side effects or unnecessary abstraction

5. **Verify**
   - run all required validation commands
   - do not continue if any fail

6. **Log**
   - update Learning Log
   - update Daily Note
   - summarize plainly

Do not skip phases.
Do not merge multiple major tasks into one iteration.

---

## Iteration rule

Each session should complete **one small, high-value, reviewable task**.

Prefer:
- fixing one bug
- tightening one runtime behavior
- strengthening one test area
- correcting one docs mismatch
- improving one narrow API inconsistency

Avoid:
- broad opportunistic refactors
- multiple unrelated fixes in one pass
- feature creep

If a task expands beyond a safe small change, stop and report it.

---

## Workflow

For every task:

1. Read relevant vault docs
2. Restate task clearly
3. Define:
   - files in scope
   - files out of scope
   - risks and assumptions
4. Propose a minimal plan
5. Implement
6. Review your own work against standards
7. Run all checks
8. Report results honestly
9. Update documentation (Learning Log + Daily Note)

---

## Quality gates (MANDATORY)

Never consider work complete unless all relevant checks pass.

Required checks:
- `npm run lint`
- `npm run check`
- `npm test`
- `npm run build`

If available, also run:
- `npm run release:check`

When `release:check` exists and is healthy, prefer it as the final validation gate.

Rules:
- Do NOT fake results
- Do NOT skip failing checks
- Do NOT weaken rules to pass
- Do NOT report success while validation is red

If something cannot be verified:
- explicitly state what could not be verified
- explain why
- do not imply full success

If validation fails:
- stop
- diagnose the exact failure
- fix the failure if it is safely in scope
- rerun validation
- do not proceed to new work until validation passes

---

## Testing rules

- Test meaningful behavior, not trivial implementation details
- Prefer real systems, project-native harnesses, or realistic flows over unnecessary mocks
- Do NOT mock what can be tested for real at reasonable cost
- Add tests for any meaningful behavior change
- Fix failing tests immediately
- Prefer deterministic tests over timing-fragile or index-fragile assertions

If a change affects:
- gateway lifecycle
- reconnect/resume logic
- command parsing
- payload validation
- public API behavior

then tests should be treated as mandatory.

---

## Code standards

- Prefer clarity over cleverness
- Strong typing required
- No silent failures
- Explicit error handling
- No magic values
- No unnecessary abstraction
- Keep functions focused and small
- Preserve public API consistency
- Prefer explicit, predictable behavior over hidden convenience

---

## Security rules

- Never hardcode secrets
- Validate external input
- Avoid unsafe execution patterns
- Follow least-privilege thinking
- Call out security-sensitive code paths when relevant

---

## Scope control

Before editing, define:
- files in scope
- files out of scope
- what is explicitly not being changed

Do NOT:
- modify unrelated files
- perform large refactors without justification
- introduce hidden behavior changes
- quietly widen the task

If the best fix requires broader change than expected, stop and report it first.

---

## Hard blocks

You must NOT:
- push code unless explicitly asked
- claim success without verification
- ignore failing tests
- disable lint/type/test rules to get green output
- make destructive changes without warning
- continue to the next task while current validation is failing

---

## Traceability

Every session must include:

- context checked
- files changed
- what changed
- why it changed
- checks run + results
- risks, assumptions, or follow-ups

Always make it possible for a human reviewer to understand the session quickly.

---

## Documentation requirements

At the end of each session:

### Learning Log
Create/update:

`docs/vault/Learning Logs/YYYY-MM-DD - Fluxer.js - <topic>.md`

Include:
- task
- reasoning
- tradeoffs
- issues
- tests run
- results
- lessons learned
- next steps

### Daily Note
Create/update:

`docs/vault/Daily Notes/YYYY-MM-DD.md`

Include:
- what was done
- project
- test/build status
- remaining issues
- layman explanation

If today’s Daily Note already exists, append a clearly labeled new section.

---

## Output format

Responses should include:

1. Context checked
2. Scout findings
3. Task understanding
4. Scope
5. Plan
6. Implementation summary
7. Review findings
8. Validation results
9. Documentation updates
10. Plain-English explanation

---

## Stop conditions

Stop and report instead of continuing if:
- the next fix requires broad refactoring
- architecture guidance conflicts
- validation cannot be made green safely
- the task becomes ambiguous
- the task expands beyond a single safe iteration

Do not improvise major product decisions silently.

---

## Final rule

Correct, testable, maintainable code is more important than speed.

Do not surprise the user.