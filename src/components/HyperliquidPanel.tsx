import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import { HYPERLIQUID_DOCS_URL, hyperliquidSnapshot } from "../lib/data";
import type { HyperliquidHistoryPoint, HyperliquidReserve } from "../types";
import { formatDate, formatPercent, formatUsd, ModeBadge, SourceLink } from "./Shared";

function ChartFrame({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <article className="chart-card"><div><h3>{title}</h3><small>{note}</small></div><div className="chart-wrap">{children}</div></article>;
}

function chartTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function HyperliquidPanel({ reserves, history, loading }: { reserves: HyperliquidReserve[]; history: HyperliquidHistoryPoint[]; loading: boolean }) {
  const assets = useMemo(() => [...new Set(history.map((point) => point.asset))], [history]);
  const [selectedAsset, setSelectedAsset] = useState("USDC");
  const asset = assets.includes(selectedAsset) ? selectedAsset : assets[0] ?? "USDC";
  const series = history.filter((point) => point.asset === asset).map((point) => ({
    ...point, time: chartTime(point.fetchedAt), borrowAprPct: point.borrowYearlyRate * 100,
    utilizationPct: point.utilization * 100,
  }));
  const first = series[0];
  const last = series.at(-1);

  return <section className="data-section dark-section" id="hyperliquid">
    <div className="section-heading inverse"><div><span className="section-no">02</span><h2>Hyperliquid live reserves</h2></div><p>Variable-rate lending inside portfolio margin.</p></div>
    <div className="section-toolbar">
      <div><ModeBadge mode="LIVE" /> <ModeBadge mode="SELF-COLLECTED" /></div>
      <SourceLink href={HYPERLIQUID_DOCS_URL}>Official Info endpoint docs</SourceLink>
    </div>
    <div className="live-grid">
      {loading && reserves.length === 0 ? <p className="loading">Validating official API response…</p> : reserves.map((reserve) => {
        const snapshot = hyperliquidSnapshot(reserve);
        return <article className="reserve-card" key={reserve.tokenIndex}>
          <div className="reserve-title"><strong>{reserve.asset}</strong><span>#{reserve.tokenIndex}</span></div>
          <dl><div><dt>Borrow yearly rate</dt><dd>{formatPercent(snapshot.borrowApr)}</dd></div><div><dt>Utilization</dt><dd>{formatPercent(snapshot.utilization)}</dd></div><div><dt>Total borrowed</dt><dd>{formatUsd(snapshot.totalBorrowed)}</dd></div><div><dt>Oracle price</dt><dd>{formatUsd(snapshot.oraclePrice, false)}</dd></div></dl>
          <small>Fetched {formatDate(reserve.fetchedAt)} UTC · API provides no oracle timestamp</small>
        </article>;
      })}
    </div>
    <div className="rate-formula"><span>Official stablecoin curve</span><code>borrow APY = 5% + 475% × max(0, utilization − 80%)</code><p>Below 80% utilization, the base borrowing rate is 5%. Above the kink, borrowing becomes sharply more expensive.</p></div>

    <div className="history-head"><div><h3>History recorded by this repository</h3><p>No public historical reserve endpoint was found in the official API docs. These charts contain only timestamped samples collected by the included SQLite collector.</p></div><label>Asset<select value={asset} onChange={(event) => setSelectedAsset(event.target.value)}>{assets.length ? assets.map((item) => <option key={item}>{item}</option>) : <option>USDC</option>}</select></label></div>
    <div className="history-proof"><span>Samples <b>{series.length}</b></span><span>From <b>{first ? formatDate(first.fetchedAt) : "Unavailable"}</b></span><span>To <b>{last ? formatDate(last.fetchedAt) : "Unavailable"}</b></span></div>
    {series.length === 0 ? <div className="empty-state"><strong>No invented history.</strong><span>Run <code>pnpm collect:hyperliquid -- --count 3 --interval-ms 1000</code> to add real observations.</span></div> : <div className="charts-grid">
      <ChartFrame title="Borrow yearly rate" note="Official API field · percentage">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="#304046"/><XAxis dataKey="time" stroke="#9ca9a5"/><YAxis stroke="#9ca9a5" domain={["auto", "auto"]}/><Tooltip/><Line type="monotone" dataKey="borrowAprPct" stroke="#b7f34d" strokeWidth={2} dot/></LineChart></ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title="Utilization" note="Borrowed ÷ supplied · percentage">
        <ResponsiveContainer width="100%" height="100%"><AreaChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="#304046"/><XAxis dataKey="time" stroke="#9ca9a5"/><YAxis stroke="#9ca9a5"/><Tooltip/><Area type="monotone" dataKey="utilizationPct" stroke="#4dd9f3" fill="#4dd9f344"/></AreaChart></ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title="Borrowed liquidity" note="Official totalBorrowed · token units">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="#304046"/><XAxis dataKey="time" stroke="#9ca9a5"/><YAxis stroke="#9ca9a5" width={68}/><Tooltip/><Line type="monotone" dataKey="totalBorrowed" stroke="#ffb86b" strokeWidth={2}/></LineChart></ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title="Rate vs utilization" note="Each dot is one collected observation">
        <ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#304046"/><XAxis type="number" dataKey="utilizationPct" name="Utilization %" stroke="#9ca9a5"/><YAxis type="number" dataKey="borrowAprPct" name="Borrow rate %" stroke="#9ca9a5"/><Tooltip cursor={{strokeDasharray:"3 3"}}/><Scatter data={series} fill="#b7f34d"/></ScatterChart></ResponsiveContainer>
      </ChartFrame>
    </div>}
  </section>;
}
