# Finora

Finora is a tax dashboard for Brazilians. Users connect their bank and brokerage accounts through Open Finance Brasil, and we turn that data into the tax reports, guides and declarations Brazilian law requires. On top of the reports, users can start **tax agents** that do the work end to end: generate the documents, pay the taxes, and submit filings to the government portals.

There are two ways in: the **web dashboard** and **WhatsApp**. On WhatsApp the user signs in with the same bank connections and tells us about themselves in plain language: "I get paid in dollars by a US company", "I have an MEI", "I sold some stock in March". We turn that into their fiscal profile, and ask whether they want to onboard their companies too.

## What we never compromise on

People hand us their bank data and trust us to deal with the Receita Federal for them. A mistake here costs them real money, a fine, or a problem with their CPF. Here is what has to stay true as the product grows.

### 1. The numbers are right, and we can show why

Every amount we show, pay or file traces back to the transactions it came from and to the legal rule that produced it. If we cannot explain a number to the user, and to an auditor, it does not ship.

### 2. Agents prepare, people approve

Tax agents can do almost anything on the user's behalf except take the final step. Paying a DARF, sending a declaration, or signing anything waits for the user's explicit approval of that exact payload. Doing it automatically is never a feature.

### 3. Financial data is the most private data there is

We collect the minimum scope we need, keep it only as long as the consent lasts, and delete it when the user leaves. LGPD is the floor.

### 4. Two channels, one product

The dashboard and WhatsApp share one account, one fiscal profile and one state. Something the user can do in one channel should be possible in the other, or the other should link to it. A user who onboarded on WhatsApp opens the dashboard and finds everything already there.

## A note from Thalles

I want code that looks like someone typed it on purpose: flat, short, named well, one way to do each thing, nothing clever. Tax law is complicated enough. The code should not add more on top.

Measure twice, cut once, and YAGNI. Build the smallest version that makes the correct behavior obvious, and push back on scope creep, including your own. When the law is ambiguous, say so and ask. Do not paper over it with a guess.

Treat the rest of this file as good defaults, not hard rules. If something here fights the task in front of you, say it loudly and get a sign-off before breaking it.

## Hackathon

We are building this in a hackathon, so the focus is getting the thing done fast.

- Work directly on `main`. Do not create branches or worktrees, including for subagents.
- Spawn subagents freely to speed things up. Run independent work in parallel: research, separate files, checks.
- Going fast never relaxes "What we never compromise on" or "The three ways to hurt yourself".

## A small glossary

Use these words consistently.

- **you** means the coding agent reading this file and changing the codebase.
- **we, us** mean Thalles and the people building Finora.
- **user** means the person whose taxes we handle: a taxpayer (CPF) and possibly the companies (CNPJ) they own.
- **tax agent** means the product's agents that run tax work for a user. Never call them just "agent" in code or copy; that word is for you.
- **run** means one execution of a tax agent, from trigger to approval to receipt.
- **channel** means where the user talks to us: `web` or `whatsapp`.
- **connection** means an Open Finance consent between the user and one institution. It has scopes and an expiry date.
- **institution** means a bank, broker or fintech on the other side of a connection.
- **fiscal profile** means the facts we know about a user's tax situation: residency, foreign income, dependents, companies and their regimes. Each fact keeps its source (a connection, a document, or a message the user confirmed).
- **company** means a CNPJ the user owns or is a partner in, with its regime: MEI, Simples Nacional, Lucro Presumido or Lucro Real.
- **obligation** means something the law requires for a period: DIRPF, carnê-leão, GCAP, DAS, DASN-SIMEI, and so on.
- **ano-calendário / exercício** mean the year the income happened and the year it is declared. DIRPF 2026 (exercício) covers ano-calendário 2025. Never write a bare "tax year" in code or copy; say which one.
- **guide** means a payment document such as a DARF or a DAS.
- **filing** means a submission to a government system, which always ends in a receipt (recibo).
- **approval** means the user's explicit yes for one exact payment or filing payload.

## The three ways to hurt yourself

1. **Touching real money or real filings.** Never run anything that initiates a real payment or submits to a real government portal from dev or tests. That includes Pix initiation, DARF/DAS payment and e-CAC or PGDAS-D submission. Use the sandbox and the fakes. If a flow has no sandbox, stop and ask.
2. **Moving real financial data out of its box.** Never put real CPFs, CNPJs, account numbers, balances or transactions into fixtures, tests, logs, commits, PR descriptions, screenshots or prompts outside the product. Generate synthetic data. A valid-looking CPF still has to be fake.
3. **Leaking credentials.** Open Finance tokens, digital certificates (e-CNPJ/e-CPF A1), gov.br sessions and WhatsApp API keys never get logged, returned to the client or committed. They live in the Convex environment or in encrypted storage, and they are read only by the function that uses them.

## Tax correctness

- **Code computes, models don't.** LLMs collect facts, classify transactions, ask follow-ups and explain results. Every tax amount comes from a deterministic function with tests. A model never produces a number we pay or file.
- **Money is integer centavos.** No floats and no `toFixed` along the way. Round only where the rule says to, and the way it says to.
- **Every rule has a source.** Rates, brackets, exemption limits and deadlines live in tables keyed by ano-calendário. Each entry carries its legal source as data (`source: "Lei 14.754/2023, art. 2º"`), not as a comment. Once a year has been filed against, its table does not change. A new year gets a new entry.
- **Calculations ship with worked examples.** Prefer the Receita's own published examples, and add edge cases on top: losses carried forward, foreign income converted at the right PTAX date, the R$20k monthly stock-sale exemption, MEI over the revenue limit.
- **Dates are `America/Sao_Paulo`.** Deadlines follow the specific obligation's rule, including what happens when the deadline falls on a non-business day. Do not assume. Look it up and cite it.
- **When unsure about the law, say so.** A rule you inferred and could not source is a bug waiting to happen. Flag it in your reply and leave it out of the code until we confirm it.

## Tax agents

- **Tools are Convex functions.** Anything a tax agent does, the dashboard and WhatsApp can trigger through the same function, and the other way around. Do not hide logic in prompts or in UI handlers.
- **Approval binds to the payload.** An approval records the exact amount, beneficiary, period and a hash of the document. If any of that changes, the old approval is void and the user approves again.
- **Every external action is idempotent.** Payments and filings carry an idempotency key, so a retry never pays or files twice. A retificadora is a new filing, not a retry.
- **Every run leaves a trail:** the inputs, the rule table versions used, what was produced, who approved it and when, and the receipts or proof of payment. Users can see that trail.
- **Government portals are brittle.** Each portal sits behind its own adapter. When a portal changes or fails, the run stops in a visible `needs_user` state with evidence attached. It never retries blindly and never guesses.
- **Reverse states exist.** Users can cancel a run that is waiting for approval, revoke a scheduled payment, and see what was already done and cannot be undone.

## WhatsApp onboarding

- **Never collect secrets in chat.** Bank connections go through the Open Finance redirect link, and gov.br access goes through its own flow. If a user pastes a password or a certificate, we don't store it, and we tell them why.
- **Free text becomes confirmed facts.** We turn what the user says into structured fiscal profile facts. They confirm each one before it counts, and we keep the message it came from.
- **Ask, don't assume.** Foreign income, companies, dependents, investments abroad, rental income: when the data hints at one of these, ask. Do not silently classify it.
- **Keep messages short, in pt-BR, and minimal.** Never put a full CPF, balances or document contents in a message. Link to the dashboard for details.
- **Respect Meta's rules.** Outside the 24-hour service window, we can only send approved templates. Deadline reminders and approval requests have to work within that limit.

## Open Finance

- Read-only data consents (accounts, transactions, investments) and payment-initiation consents are different things with different flows. Never widen a scope to save a step.
- Consents expire and institutions go down. Every connection has visible `active`, `expiring`, `expired` and `revoked` states, plus a way to renew. Reports built on stale data say so.
- The aggregator or ITP we use sits behind one adapter. Nothing outside it knows the vendor's shapes.

## Hit every surface

The most common defect will be a change that works where you tested it and is missing everywhere else. Before calling work done, walk this list and say which items applied:

- **Channels.** Web and WhatsApp. If it is reachable in one, decide what happens in the other.
- **Taxpayers.** CPF only, CPF with an MEI, Simples Nacional, presumido. Features shaped by regime need a decision for each regime, even if the decision is "not supported yet, and the user is told".
- **Years.** Does it hold for the previous ano-calendário and the current one? Filed years are read-only.
- **Tax agents.** If a user can trigger it, a tax agent probably should too, through the same function.
- **Reverse states.** Connect needs disconnect. Onboard a company needs remove it. Approve needs cancel while it still can be cancelled. A one-way door is a bug.
- **Failure states.** Expired consent, portal down, payment rejected, user unreachable on WhatsApp.

## Dev and verifying

- `bun install` installs. `bun run dev` starts web and the Convex dev deployment. Use `bun run dev:web` or `bun run dev:server` for one side only. `bun run dev:setup` configures Convex the first time.
- Never run `convex deploy` and never point anything at the production deployment.
- Env schemas live in each app's `.env.schema` (Varlock). Run `bun run env:generate` after changing one. Commit schemas, never values.
- Before you hand work over, run `bun run check` (oxlint + oxfmt) and `bun run check-types`.
- Calculation, profile and approval logic ships with focused tests for that behavior (`convex-test` for Convex functions). Test behavior, not wiring. Do not write tests that mirror the implementation.
- A bug in the numbers gets a failing test first, then the fix.
- Stop the dev servers you started, by the PID you started them with. Never kill by name pattern.

## Where code lives

- `apps/web` - the dashboard. React, Vite, TanStack Router (file routes in `src/routes`, signed-in pages under `_auth`), and Clerk for auth.
- `packages/backend/convex` - the schema and every query, mutation, action and HTTP endpoint. Tax rules, calculations, tax agents, Open Finance sync and the WhatsApp webhook all live here.
- `packages/ui` - shared shadcn/ui primitives and global styles.
- `packages/config` - shared TypeScript config.
- `.agents/skills` - installed skills (Convex, Clerk, shadcn, Turborepo, React). `.claude/skills` symlinks into it. Do not edit them by hand; `skills-lock.json` tracks them.

## Taste

- Domain rules live on the server. The dashboard and the WhatsApp replies render what Convex returns. They do not recompute taxes or rebuild domain logic from lists.
- Transports stay thin. An HTTP action, webhook handler or tool definition validates input, calls one function and maps errors.
- Use the official Portuguese term for tax concepts in identifiers (`darf`, `carneLeao`, `dirpf`, `anoCalendario`). Translating them invents ambiguity. Everything else is English. User-facing copy is pt-BR.
- kebab-case files, named exports, `function` declarations, no barrels. One exported component per file, folder per feature.
- Guard clauses over `else`. Lookup tables typed by the union over `switch` chains. No nested ternaries.
- Make types true at the source. No `as`, `!` or `any` to make it compile, and no defensive `?? []` on values that can't be missing.
- No `useEffect` unless syncing with something outside React. Busy state is the mutation's pending state.
- `packages/ui` components own their look. Pick a variant; do not restyle them with `className` at the call site.
- No comments narrating code. Say it with a name, a type, or a test. A legal citation is data on the rule, not a comment.

## Pull requests

- Never open a PR unless asked.
- Conventional commit titles in plain language: `fix(darf): carnê-leão due date skips holidays`.
- Body: the problem in a sentence or two, then how you fixed it. For tax logic, cite the rule. End with the model and harness that did the work.
- UI changes need before and after images, made with synthetic data only (see rule 2).
- One request is one PR.

## Plans and docs

- Do not commit plans, research notes or scratch files. Keep them outside the repo.
- `docs/` is for decisions and their reasons, and for legal interpretations we confirmed (who confirmed it, when, and the source). Do not document what the code already says.
- When a documented decision changes, rewrite the text. Do not append a second version.
