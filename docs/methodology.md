# Methodology

## Research order

1. Confirmed protocol concepts in current official documentation.
2. Inspected official endpoint schemas and live responses.
3. Preserved protocol numeric strings through runtime validation.
4. Implemented pure derived calculations with Decimal.js.
5. Separated live, derived, self-collected, simulated, and unavailable values in the UI.
6. Added boundary tests before final visual verification.

## Hyperliquid observations

The collector calls the documented `allBorrowLendReserveStates` and `spotMeta` Info actions. Each successful capture inserts one row per reserve with the client receipt time. SQLite is the durable local store; `public/data/hyperliquid-history.json` is a deterministic export for the static dashboard.

The API does not provide historical points or an oracle observation time in the reviewed response. The collector timestamp must not be interpreted as oracle time.

## Midnight market selection

The dashboard requests the official books collection and validates each market, collateral and level. By default it selects the returned market with the largest number of bid/ask levels. The best displayed level is the first ask, otherwise the first bid, matching the ordered response observed from the API. It does not infer token symbols or decimals from addresses.

## Derived formulas

- Midnight price: `raw price / 1e18`.
- Midnight simple term rate: `1 / price − 1`.
- Simple annualized rate: `term rate × 365 / remaining days`.
- Max debt: `Σ(collateral value × LLTV)`.
- LTV: `debt / collateral value`.
- Hyperliquid stablecoin curve: `0.05 + 4.75 × max(0, utilization − 0.80)`.

Every derived formula is implemented in `src/lib/risk.ts` and covered by tests.
