# Receita Federal integration

Decided 2026-10-23 by Thalles.

## We calculate, the Receita issues

Every amount comes from our own rule tables and calculations (`packages/backend/convex/lib/rules`). The official guide (DAS, DARF) comes from the Receita. When a guide comes back with a different amount than ours, the obligation stops in `needsUser` with both numbers, and we pay nothing until someone understands the difference.

## Integra Contador, mocked for now

The real path is SERPRO's Integra Contador (PGMEI, PGDAS-D, Sicalc). The user grants our CNPJ a procuração eletrônica in e-CAC, and we call the API with our own e-CNPJ certificate. We never see the user's gov.br password. Contracting it has a cost and needs an e-CNPJ for Finances, so it waits.

Until then, `lib/receita.ts` issues fake guides and `lib/payment.ts` pays them in a sandbox. Nothing outside those two files knows they are fake. There is no code path that reaches a real portal or moves real money.

gov.br Login Único is not an option: it is not open to private companies, and scraping e-CAC with the user's password would mean collecting secrets.

## Every obligation can be done by hand

Each obligation also has a manual path: where to do it, what access it needs, the documents to have at hand, the steps, and the values from our calculation to type in. The user marks it done, optionally with the receipt, and can undo that. DIRPF only has the manual path, since it can only be filed through the PGD or Meu Imposto de Renda.
