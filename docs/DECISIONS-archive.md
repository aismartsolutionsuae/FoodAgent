# Architecture Decisions — Archive

Entries moved verbatim out of `docs/DECISIONS.md` to keep the always-auto-loaded log lean.
Archived = historical (no live constraint) or superseded by a later entry. Append-only spirit preserved: text is unedited; the live log keeps a pointer line for each.

---

## 2026-05-11 — Repository renamed: FoodAgent → Portfolio

> Archived reason: pure history, no live constraint. Moved 2026-05-16.

**Decision**: Repository renamed from `FoodAgent` to `Portfolio` on GitHub. FoodAgent becomes one of many products in `projects/food-agent/`.

**Reasoning**: Repository serves as infrastructure for multiple products, not a single product. Original naming was an artifact of starting with one product idea before pivoting to portfolio approach.

**Alternatives considered**: Keeping FoodAgent name (rejected — misleading). Creating new repo from scratch (rejected — loses history and breaks references).

---

## 2026-05-11 — Refund policy: manual approve only

> Archived reason: superseded by 2026-05-15 (Refund policy decomposed). Moved 2026-05-16.

**Decision**: All refund requests go to `approval_queue` for founder review. No auto-refund logic, even for small amounts or within trial period.

**Reasoning**: Auto-refunds create abuse vector and remove signal about why users churn. Manual review is fast (Telegram approval button) and preserves customer feedback loop.

**Alternatives considered**: Auto-refund under $50 within 24h (rejected — risk outweighs convenience for solo founder).

---
