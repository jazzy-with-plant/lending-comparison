import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { MIDNIGHT_DOCS_URL } from "../lib/data";
import { annualizeSimpleRate, impliedTermRate, priceWadToDecimal } from "../lib/risk";
import type { MidnightBook } from "../types";
import { formatDate, formatPercent, ModeBadge, shortAddress, SourceLink } from "./Shared";

export function MidnightPanel({ books, loading }: { books: MidnightBook[]; loading: boolean }) {
  const liquidBooks = useMemo(() => [...books].sort((a, b) => (b.bids.length + b.asks.length) - (a.bids.length + a.asks.length)), [books]);
  const [selected, setSelected] = useState("");
  const book = liquidBooks.find((item) => item.marketId === selected) ?? liquidBooks[0];
  const level = book?.asks[0] ?? book?.bids[0];
  const price = level ? priceWadToDecimal(level.price) : null;
  const days = book ? Math.max(0, (book.maturity * 1000 - Date.parse(book.fetchedAt)) / 86_400_000) : null;
  const termRate = price === null ? null : impliedTermRate(price);
  const annualRate = termRate !== null && days && days > 0 ? annualizeSimpleRate(termRate, days) : null;
  const rawLiquidity = book ? [...book.asks, ...book.bids].reduce((sum, item) => sum.plus(item.assets), new Decimal(0)).toFixed(0) : null;

  return <section className="data-section midnight-section" id="midnight">
    <div className="section-heading"><div><span className="section-no">04</span><h2>Morpho Midnight market</h2></div><p>Fixed terms make time and exit liquidity first-class risks.</p></div>
    <div className="section-toolbar"><div><ModeBadge mode="LIVE"/> <ModeBadge mode="DERIVED"/></div><SourceLink href={MIDNIGHT_DOCS_URL}>Official Midnight API docs</SourceLink></div>
    {loading && !book ? <p className="loading">Validating official Midnight API response…</p> : !book ? <div className="empty-state"><strong>Unavailable</strong><span>No validated Midnight book was returned.</span></div> : <>
      <div className="market-picker"><label>Validated market<select value={book.marketId} onChange={(event) => setSelected(event.target.value)}>{liquidBooks.map((item) => <option key={item.marketId} value={item.marketId}>{item.chainId === 1 ? "Ethereum" : `Chain ${item.chainId}`} · {shortAddress(item.marketId)} · {item.bids.length + item.asks.length} levels</option>)}</select></label><span>Fetched {formatDate(book.fetchedAt)} UTC</span></div>
      <div className="midnight-grid">
        <article className="market-identity"><span className="card-kicker">Contract identity</span><h3>{shortAddress(book.marketId)}</h3><dl><div><dt>Chain ID</dt><dd>{book.chainId}</dd></div><div><dt>Loan token</dt><dd title={book.loanToken}>{shortAddress(book.loanToken)}</dd></div><div><dt>Collateral count</dt><dd>{book.collaterals.length}</dd></div><div><dt>Book levels</dt><dd>{book.bids.length} bid / {book.asks.length} ask</dd></div></dl></article>
        <article className="maturity-card"><span className="card-kicker">Time boundary</span><div className="days-number">{days?.toFixed(0)}<small>days</small></div><p>Maturity: <b>{formatDate(book.maturity)} UTC</b></p><p className="plain-note">Before maturity, unhealthy debt can be liquidated. Strictly after maturity, any remaining debt is liquidatable under Midnight’s documented rule.</p></article>
        <article className="pricing-card"><span className="card-kicker">Best available book level</span><dl><div><dt>Unit price</dt><dd>{price?.toFixed(6) ?? "Unavailable"}</dd></div><div><dt>Implied term rate</dt><dd>{formatPercent(termRate)}</dd></div><div><dt>Simple annualized rate</dt><dd>{formatPercent(annualRate)}</dd></div><div><dt>Secondary liquidity</dt><dd>{rawLiquidity ? `${rawLiquidity} raw assets` : "Unavailable"}</dd></div></dl><p>Price is the official 1e18-scaled book price. Rates are derived as 1/P − 1 and annualized by remaining days.</p></article>
      </div>
      <div className="collateral-table"><div className="table-head"><span>Collateral token</span><span>LLTV</span><span>Oracle contract</span><span>Position risk</span></div>{book.collaterals.map((item) => <div className="table-row" key={item.token}><span title={item.token}>{shortAddress(item.token)}</span><span>{formatPercent(new Decimal(item.lltv).div("1e18").toNumber())}</span><span title={item.oracle}>{shortAddress(item.oracle)}</span><span><ModeBadge mode="UNAVAILABLE"/> no wallet position selected</span></div>)}</div>
      <div className="unavailable-note"><strong>Position collateral, oracle value, maxDebt, debt and liquidation distance are unavailable here.</strong><span>The public market/book response does not contain a user position or current oracle answer. The lab does not fabricate them. Once a position is supplied, the official rule is <code>maxDebt = Σ(collateral value × LLTV)</code>.</span></div>
    </>}
  </section>;
}
