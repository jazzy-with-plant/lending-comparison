# Assumptions and non-assumptions

## Stress simulator assumptions

- HYPE borrowing LTV: 65%.
- BTC borrowing LTV: 50%.
- HYPE liquidation threshold: 82.5%.
- BTC liquidation threshold: 75%.
- ETH perp maintenance rate: 2%, corresponding to the documented first 25× tier for the small default notional.
- Minimum borrow offset: $20.
- The price shock changes the long perp PnL and current notional; collateral USD values remain fixed unless edited by the user.

The estimated liquidation buffer is:

```text
(HYPE value × 82.5% + BTC value × 75% + perp PnL)
− stablecoin debt
− (current perp notional × 2% + $20)
```

This is a teaching projection. It excludes live account balances, collateral/borrow caps, oracle medians, higher margin tiers, maintenance deductions, isolated positions, subaccounts, and liquidation ordering. It is never labeled live.

## Deliberate non-assumptions

- No token symbol is inferred from a Midnight contract address.
- No token decimals are guessed when absent from a response.
- No oracle timestamp is equated with fetch time.
- No “manual borrow” action is invented for Hyperliquid.
- No historical point is interpolated, backfilled, or randomly generated.
- No wallet position is fabricated for the Midnight risk panel.

## Unavailable values

`Unavailable` is an output, not an error to hide. It means the selected official response did not carry enough information to compute the value without a new data source or a user position.
