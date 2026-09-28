import { useEffect } from "react";
import { HyperliquidPanel } from "./components/HyperliquidPanel";
import { MidnightPanel } from "./components/MidnightPanel";
import { StressLab } from "./components/StressLab";
import { ModeBadge, SectionHeading, SourceLink } from "./components/Shared";
import { useProtocolData } from "./hooks/useProtocolData";
import { registerStressTool } from "./lib/webmcp";

const comparisonRows = [
  ["Rate mechanism", "A unit price fixes the term economics; implied rate = 1/P − 1", "Stablecoin borrow APY changes with reserve utilization"],
  ["Maturity", "Explicit timestamp; any debt after maturity is liquidatable", "No contractual maturity in reserve borrowing"],
  ["Collateral scope", "Isolated market with a configured collateral set and LLTV per asset", "Eligible collateral supports a shared portfolio-margin account"],
  ["Health model", "maxDebt = Σ(collateral value × LLTV); debt must stay ≤ maxDebt before maturity", "Portfolio margin ratio combines debt, collateral haircuts, perp maintenance and account balances"],
  ["Early exit", "Requires an opposite trade and therefore secondary liquidity", "Repay or reduce exposure while the account remains healthy and liquidity exists"],
  ["Liquidation trigger", "Unhealthy before maturity; any remaining debt strictly after maturity", "Documented liquidatability when portfolio margin ratio exceeds 0.95"],
  ["Rate risk", "Known term economics for the units traded", "Borrow rate can rise sharply as utilization moves above 80%"],
  ["Contagion path", "Market isolation contains most collateral risk", "Perp losses and spot borrowing share portfolio equity"],
];

export function App() {
  const { reserves, history, books, loading, errors, refresh } = useProtocolData();
  useEffect(() => registerStressTool(), []);

  return <main>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Lending Market Structure Lab home"><span className="brand-mark">L/</span><span>Lending Market Structure Lab</span></a>
      <nav aria-label="Primary navigation"><a href="#compare">Compare</a><a href="#hyperliquid">Live rates</a><a href="#stress">Stress lab</a><a href="#midnight">Midnight</a></nav>
      <button className="refresh-button" type="button" onClick={() => void refresh()} disabled={loading}><i />{loading ? "Refreshing" : "Refresh live"}</button>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow">PROTOCOL RESEARCH TERMINAL · 01</div>
      <h1>Same word: lending.<br/><em>Different risk machines.</em></h1>
      <p className="lede">Compare fixed-maturity credit on Morpho Midnight with portfolio-margin borrowing on Hyperliquid—using official data, explicit formulas, and no invented history.</p>
      <div className="hero-meta"><span>Markets <b>2</b></span><span>Official adapters <b>2</b></span><span>Simulation <b>clearly separated</b></span></div>
      <div className="mode-legend"><ModeBadge mode="LIVE"/><span>official response</span><ModeBadge mode="DERIVED"/><span>shown formula</span><ModeBadge mode="SELF-COLLECTED"/><span>timestamped locally</span><ModeBadge mode="SIMULATED"/><span>user-controlled research case</span></div>
    </section>

    {errors.length > 0 && <aside className="error-banner" role="status"><div><strong>Partial data mode</strong>{errors.map((error) => <span key={error}>{error}</span>)}</div><button type="button" onClick={() => void refresh()}>Retry adapters</button></aside>}

    <section className="comparison-section" id="compare">
      <SectionHeading number="01" title="Architecture comparison" copy="Read the structure before reading the APY."/>
      <div className="comparison-table" role="table" aria-label="Protocol architecture comparison">
        <div className="comparison-row comparison-head" role="row"><span role="columnheader">Risk dimension</span><span role="columnheader"><b className="midnight-dot"/> Morpho Midnight</span><span role="columnheader"><b className="hyper-dot"/> Hyperliquid</span></div>
        {comparisonRows.map(([dimension, midnight, hyperliquid]) => <div className="comparison-row" role="row" key={dimension}><span role="cell">{dimension}</span><span role="cell">{midnight}</span><span role="cell">{hyperliquid}</span></div>)}
      </div>
      <div className="proof-strip"><div><span>Midnight</span><strong>PRICE → TERM RATE → MATURITY</strong></div><div><span>Hyperliquid</span><strong>UTILIZATION → APR → PORTFOLIO MARGIN</strong></div></div>
      <div className="manual-borrow-note"><strong>Manual borrow vs Portfolio Margin</strong><p>Hyperliquid’s current public docs clearly specify Portfolio Margin auto-borrowing, reserve state, and supply/withdraw CoreWriter actions. A separate “manual borrow” transaction flow is not documented in the official pages reviewed for this project, so this lab does not invent one.</p><SourceLink href="https://hyperliquid.gitbook.io/hyperliquid-docs/trading/portfolio-margin">Read the official model</SourceLink></div>
    </section>

    <HyperliquidPanel reserves={reserves} history={history} loading={loading}/>
    <StressLab/>
    <MidnightPanel books={books} loading={loading}/>

    <section className="method-section" id="method">
      <SectionHeading number="05" title="What the labels protect" copy="Provenance is part of every result."/>
      <div className="method-grid"><article><ModeBadge mode="LIVE"/><h3>Official API response</h3><p>Runtime-validated with Zod. Invalid shapes fail visibly instead of silently becoming zero.</p></article><article><ModeBadge mode="DERIVED"/><h3>Transparent calculation</h3><p>Rates and risk metrics are computed from displayed formulas and tested pure functions.</p></article><article><ModeBadge mode="SELF-COLLECTED"/><h3>Local observation history</h3><p>SQLite records when this collector saw each reserve. It is not protocol-provided history.</p></article><article><ModeBadge mode="UNAVAILABLE"/><h3>No proxy values</h3><p>Missing wallet, oracle timestamp or position data stays unavailable—never replaced with a plausible guess.</p></article></div>
    </section>

    <footer><div><span className="brand-mark">L/</span><strong>Lending Market Structure Lab</strong></div><p>Source-first educational research. Not financial advice.</p><a href="https://github.com/jazzy-with-plant/lending-comparison" target="_blank" rel="noreferrer">Source code ↗</a></footer>
  </main>;
}
