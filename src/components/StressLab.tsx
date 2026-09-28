import { useEffect, useMemo, useState } from "react";
import { simulatePortfolioStress } from "../lib/risk";
import type { StressInput } from "../types";
import { formatPercent, formatUsd, ModeBadge, SourceLink, StatusBadge } from "./Shared";

const PORTFOLIO_DOCS = "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-margin";

const defaults: StressInput = {
  hypeCollateralUsd: 20_000,
  btcCollateralUsd: 30_000,
  debtUsd: 15_000,
  perpNotionalUsd: 40_000,
  perpShock: -0.2,
};

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="number-field"><span>{label}</span><div><b>$</b><input type="number" min="0" step="1000" value={value} onChange={(event) => onChange(Number(event.target.value))}/></div></label>;
}

export function StressLab() {
  const [input, setInput] = useState(defaults);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<Partial<StressInput>>).detail;
      setInput((current) => ({ ...current, ...detail }));
    };
    window.addEventListener("lending-lab:set-stress", listener);
    return () => window.removeEventListener("lending-lab:set-stress", listener);
  }, []);
  const result = useMemo(() => simulatePortfolioStress(input), [input]);
  const rows = [-0.1, -0.2, -0.4, -0.6, -0.8].map((perpShock) => ({ perpShock, ...simulatePortfolioStress({ ...input, perpShock }) }));
  const update = (key: keyof StressInput, value: number) => setInput((current) => ({ ...current, [key]: value }));

  return <section className="data-section stress-section" id="stress">
    <div className="section-heading"><div><span className="section-no">03</span><h2>Portfolio Margin stress lab</h2></div><p>See how a perp loss can consume borrowing capacity.</p></div>
    <div className="section-toolbar"><ModeBadge mode="SIMULATED"/><SourceLink href={PORTFOLIO_DOCS}>Official Portfolio Margin docs</SourceLink></div>
    <div className="research-warning"><strong>Research scenario—not an account liquidation quote.</strong><span>Uses published HYPE/BTC LTVs, liquidation thresholds, the first ETH maintenance tier, and a $20 minimum borrow offset. Account caps, oracle medians, tier deductions and liquidation ordering require full live account state.</span></div>
    <div className="stress-layout">
      <div className="controls-card">
        <h3>Starting balance sheet</h3>
        <NumberField label="HYPE collateral value" value={input.hypeCollateralUsd} onChange={(value) => update("hypeCollateralUsd", value)}/>
        <NumberField label="BTC collateral value" value={input.btcCollateralUsd} onChange={(value) => update("btcCollateralUsd", value)}/>
        <NumberField label="Stablecoin debt" value={input.debtUsd} onChange={(value) => update("debtUsd", value)}/>
        <NumberField label="ETH long notional" value={input.perpNotionalUsd} onChange={(value) => update("perpNotionalUsd", value)}/>
        <label className="shock-control"><span>ETH price shock <b>{formatPercent(input.perpShock, 0)}</b></span><input type="range" min="-100" max="50" step="5" value={input.perpShock * 100} onChange={(event) => update("perpShock", Number(event.target.value) / 100)}/><small>−100%</small><small>+50%</small></label>
      </div>
      <div className="results-card">
        <div className="result-status"><span>Projected status</span><StatusBadge status={result.status}/></div>
        <div className="big-result"><span>Liquidation buffer</span><strong className={result.liquidationBufferUsd < 0 ? "negative" : ""}>{formatUsd(result.liquidationBufferUsd, false)}</strong></div>
        <dl className="result-grid">
          <div><dt>Perp PnL</dt><dd>{formatUsd(result.perpPnlUsd, false)}</dd></div>
          <div><dt>Account equity</dt><dd>{formatUsd(result.equityUsd, false)}</dd></div>
          <div><dt>Borrow headroom</dt><dd>{formatUsd(result.borrowHeadroomUsd, false)}</dd></div>
          <div><dt>Effective LTV</dt><dd>{formatPercent(result.effectiveLtv)}</dd></div>
          <div><dt>Liquidation-adjusted collateral</dt><dd>{formatUsd(result.liquidationAdjustedCollateralUsd, false)}</dd></div>
          <div><dt>Perp maintenance + offset</dt><dd>{formatUsd(result.perpMaintenanceUsd, false)}</dd></div>
        </dl>
        <p className="explain-line">A losing perp lowers the USD balance shared by the portfolio. That can shrink borrow headroom even when the HYPE and BTC token quantities have not changed.</p>
      </div>
    </div>
    <div className="sensitivity"><h3>Sensitivity table</h3><div className="sensitivity-grid"><span>ETH shock</span><span>Perp PnL</span><span>Buffer</span><span>Status</span>{rows.map((row) => <div className="sensitivity-row" key={row.perpShock}><span>{formatPercent(row.perpShock, 0)}</span><span>{formatUsd(row.perpPnlUsd, false)}</span><span>{formatUsd(row.liquidationBufferUsd, false)}</span><StatusBadge status={row.status}/></div>)}</div></div>
  </section>;
}
