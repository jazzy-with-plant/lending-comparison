# Architecture

## Boundary design

`src/lib/data.ts` is the protocol boundary. Unknown JSON is checked with Zod before it becomes an application type. Errors carry the protocol and failure class into the visible partial-data banner.

`LendingMarketSnapshot` supplies a common read model:

- protocol and market identity;
- rates, utilization, liquidity, oracle price, LTV, and maturity;
- provenance containing mode, source URL, endpoint, fetch time, observation time, and a caveat.

Protocol-specific fields remain in `HyperliquidReserve` and `MidnightBook`; the common model never forces an unavailable fixed-maturity field into a variable-rate reserve or vice versa.

## Pure risk engine

`src/lib/risk.ts` has no React, network, file, or clock dependencies. Midnight maturity checks receive `now` as an argument in tests. Decimal.js handles token-scaled integers and rate calculations.

## Failure behavior

The three browser reads—Hyperliquid live, local history export, and Midnight live—run independently with `Promise.allSettled`. One failure does not erase successful data from another adapter. Retry is explicit.

## Storage

The collector uses sql.js to produce a real SQLite database without a platform-specific native module. The binary database is ignored; the chart JSON is committed so the portfolio page can show the verified observations included with that revision.
