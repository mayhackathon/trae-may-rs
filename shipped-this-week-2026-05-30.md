# What shipped this week (ending 2026-05-30)

## Highlights
- **Checkout totals:** prevent a shipping coupon from being applied **twice** during recalculation (e.g., after changing shipping method).
- **Payments:** align the **payment intent / authorization amount** with the **final computed totals after discounts**.
- **Quality:** added a regression test for the original “double application” scenario.

## Engineering detail
**PR merged**
- #1842 — *Checkout: prevent shipping coupon from applying twice* (merged 2026-05-29)  
  https://example.invalid/org/repo/pull/1842

**Commits (2026-05-26..2026-05-30)**
- a1b2c3d — Fix checkout coupon double-application on shipping lines (2026-05-28)
- d4e5f6g — Update payment intent amount calculation to use final discounted totals (2026-05-28)
- h7i8j9k — Add regression test: shipping coupon not counted twice (2026-05-29)

## Why it changed
- Support reported customer confusion where the **shipping discount appeared twice**.
- Risk of mismatch between **displayed totals** and the **authorized payment amount**.

## Ticket(s) closed
- **CHK-2311** — Shipping coupon applied twice in checkout totals (Status: Done, Priority: High)

## Support context (signals)
- Customers saw shipping coupon discount listed twice; common repro: apply coupon → change shipping method → discount duplicated.
- Escalation question raised about whether shipping discounts should affect cobbler payout calculations (policy reference not confirmed).

## Notes for verification
- Re-test: shipping coupon + changing shipping method (recalculation) and confirm only one shipping adjustment.
- Confirm payment provider authorization amount matches the final order total after discounts.

## Risks / watch-outs
- Checkout total calculation behavior changed; watch edge cases involving mixed discounts.
- Payment intent now strictly follows computed totals; verify in payment sandbox.

## Open question (needs policy confirmation)
- Should shipping discounts reduce cobbler payout, or is payout calculated from pre-discount shipping revenue?

