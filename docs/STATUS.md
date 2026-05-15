# Project Status

> Last updated: 2026-05-11
> Update cadence: weekly, Monday

## Active

- **Infrastructure layer**: build out `packages/bot-core/*` modules per CLAUDE.md (5 agent layers).
- **No product selected yet** for first MVP. Selection happens after infrastructure stabilizes.

## Frozen

- **FoodAgent** (`projects/food-agent/`): frozen since 2026-05-10. Reason: focus shifted from product-first to infrastructure-first. Reactivate after at least one trainer product (likely NOC Generator or similar low-complexity candidate) is launched and stable.

## Next (planned, not started)

- Pick first training product from portfolio idea list (NOC Generator, WPS Calculator, or other low-complexity candidate).
- Run idea development playbook on selected product before coding.

## Open architectural questions

- **VAT / Payments switch to Stripe** — revisit when founder obtains UAE business license. Under Lemon Squeezy (MoR) VAT is handled by LS. Under Stripe founder must register TRN and file VAT 5% (mandatory above 375k AED/year revenue). Also reconsider AED-inclusive vs USD pricing display at that point.
- **Web auth method** — not yet chosen (magic link / OAuth / anonymous-first). Decision defines what the `web` channel's `channel_user_id` holds in `user_identities` (see DECISIONS.md 2026-05-15). Decide when first web-facing product is selected; no impact on Telegram-only products.
