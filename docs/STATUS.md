# Project Status

> Last updated: 2026-05-11
> Update cadence: weekly, Monday

## Active

- **Infrastructure layer**: build out `packages/bot-core/*` modules per CLAUDE.md (5 agent layers).
- **No product selected yet** for first MVP. Selection happens after infrastructure stabilizes.

## Archived

- **FoodAgent**: removed from working tree 2026-05-15, preserved in git tag `food-agent-archive` (recoverable via `git checkout food-agent-archive -- projects/food-agent`). Minimal revival likelihood. Was originally intended as the project template; template will instead be rebuilt fresh on a real test product. Reason for removal: frozen product-specific code (types, scrapers, schema) kept polluting the shared package and blocking infrastructure-first work.

## Next (planned, not started)

- Pick first training product from portfolio idea list (NOC Generator, WPS Calculator, or other low-complexity candidate).
- Run idea development playbook on selected product before coding.

## Open architectural questions

- **VAT / Payments switch to Stripe** — revisit when founder obtains UAE business license. Under Lemon Squeezy (MoR) VAT is handled by LS. Under Stripe founder must register TRN and file VAT 5% (mandatory above 375k AED/year revenue). Also reconsider AED-inclusive vs USD pricing display at that point.
- **Web auth method** — not yet chosen (magic link / OAuth / anonymous-first). Decision defines what the `web` channel's `channel_user_id` holds in `user_identities` (see DECISIONS.md 2026-05-15). Decide when first web-facing product is selected; no impact on Telegram-only products.
