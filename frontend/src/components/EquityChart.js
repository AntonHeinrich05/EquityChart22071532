import React, { useState, useEffect, useMemo } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceDot, CartesianGrid,
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COIN_COLORS = ['#FFD60A', '#FF9F0A', '#BF5AF2', '#64D2FF', '#30D158',
  '#FF6482', '#AC8E68', '#5E5CE6', '#FFB340', '#66D4CF'];

const fmtTime = (iso) => {
  try {
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return iso; }
};

export default function EquityChart({ jobId }) {
  const [points, setPoints] = useState(null);
  const [err, setErr] = useState(null);
  const [showDD, setShowDD] = useState(true);
  const [showLS, setShowLS] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [stratFilter, setStratFilter] = useState('');

  useEffect(() => {
    if (!jobId) return;
    setPoints(null); setErr(null);
    fetch(`${API_URL}/api/backtest/equity/${jobId}`)
      .then(r => { if (!r.ok) throw new Error('no data'); return r.json(); })
      .then(d => setPoints(d.points || []))
      .catch(() => setErr('Keine Equity-Daten für diesen Backtest verfügbar'));
  }, [jobId]);

  const strategies = useMemo(() => {
    const m = {};
    (points || []).forEach(p => { if (p.strategy_id) m[p.strategy_id] = p.strategy_name || p.strategy_id; });
    return m;
  }, [points]);

  const { data, coins, liqs } = useMemo(() => {
    const pts = (points || []).filter(p => !stratFilter || p.strategy_id === stratFilter);
    const coinSet = [...new Set(pts.map(p => p.symbol))];
    let eq = 0, peak = 0, lo = 0, sh = 0;
    const coinEq = {};
    coinSet.forEach(c => { coinEq[c] = 0; });
    const rows = [];
    const liqPts = [];
    pts.forEach((p, i) => {
      eq += p.pnl; peak = Math.max(peak, eq);
      if (p.side === 'LONG') lo += p.pnl; else sh += p.pnl;
      coinEq[p.symbol] += p.pnl;
      const row = {
        i, t: p.t, equity: +eq.toFixed(4), peak: +peak.toFixed(4),
        dd: +(eq - peak).toFixed(4),
        long: +lo.toFixed(4), short: +sh.toFixed(4),
        side: p.side, pnl: p.pnl, symbol: p.symbol, liquidated: p.liquidated,
      };
      coinSet.forEach(c => { row[`c_${c}`] = +coinEq[c].toFixed(4); });
      rows.push(row);
      if (p.liquidated) liqPts.push(row);
    });
    return { data: rows, coins: coinSet, liqs: liqPts };
  }, [points, stratFilter]);

  if (err) return <div className="bt-hint" data-testid="equity-chart-empty">{err}</div>;
  if (!points) return <div className="bt-hint">Equity-Kurve lädt...</div>;
  if (!data.length) return <div className="bt-hint" data-testid="equity-chart-empty">Keine geschlossenen Trades – keine Equity-Kurve.</div>;

  const chip = (on, set, label, testid) => (
    <button className={`bt-chip ${on ? 'on' : ''}`} style={{ fontSize: 11, padding: '3px 9px' }}
      onClick={() => set(v => !v)} data-testid={testid}>{label}</button>
  );

  return (
    <div data-testid="equity-chart">
      <div className="bt-section-title" style={{ marginTop: 14 }}>
        EQUITY-KURVE (kumulierter PnL pro Trade)
        <span className="btc-export">
          <a href={`${API_URL}/api/backtest/export/${jobId}?kind=equity`} className="btc-export-btn"
            data-testid="equity-export-csv">
            <DownloadSimple size={13} weight="bold" /> equity.csv
          </a>
        </span>
      </div>
      <div className="bt-chips" style={{ marginBottom: 6 }}>
        {chip(showDD, setShowDD, 'Drawdown-Bereiche', 'equity-toggle-dd')}
        {chip(showLS, setShowLS, 'Long/Short getrennt', 'equity-toggle-ls')}
        {chip(showCoins, setShowCoins, 'Coin-Beiträge', 'equity-toggle-coins')}
        {Object.keys(strategies).length > 1 && (
          <select value={stratFilter} onChange={e => setStratFilter(e.target.value)}
            data-testid="equity-strategy-filter"
            style={{ background: '#0A0A0A', border: '1px solid #2A2D3A', borderRadius: 8, color: '#fff', fontSize: 11, padding: '3px 8px' }}>
            <option value="">Alle Strategien</option>
            {Object.entries(strategies).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        {liqs.length > 0 && (
          <span style={{ color: '#FF453A', fontSize: 11, alignSelf: 'center' }} data-testid="equity-liq-count">
            ⚠ {liqs.length} Liquidation{liqs.length > 1 ? 'en' : ''} (rote Punkte)
          </span>
        )}
      </div>
      <div style={{ width: '100%', height: 320, background: '#0A0C12', border: '1px solid #1E2230', borderRadius: 10, padding: '10px 4px 0 0' }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1A1E2C" strokeDasharray="3 3" />
            <XAxis dataKey="i" tick={{ fill: '#5C6070', fontSize: 10 }}
              tickFormatter={(i) => data[i] ? fmtTime(data[i].t) : i} minTickGap={60} />
            <YAxis tick={{ fill: '#5C6070', fontSize: 10 }} width={55}
              tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip
              contentStyle={{ background: '#12141C', border: '1px solid #2A2D3A', borderRadius: 8, fontSize: 11 }}
              labelFormatter={(i) => data[i]
                ? `${fmtTime(data[i].t)} · ${data[i].symbol?.replace('USDT', '')} ${data[i].side} · Trade-PnL ${data[i].pnl?.toFixed(3)}${data[i].liquidated ? ' · LIQUIDIERT ⚠' : ''}`
                : ''}
              formatter={(v, name) => [Number(v).toFixed(3), name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {showDD && (
              <Area type="monotone" dataKey="dd" name="Drawdown" fill="#FF453A"
                fillOpacity={0.18} stroke="#FF453A" strokeOpacity={0.4} strokeWidth={1} />
            )}
            <Line type="monotone" dataKey="peak" name="Peak" stroke="#3A3F55"
              dot={false} strokeWidth={1} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="equity" name="Equity" stroke="#00A8FF"
              dot={false} strokeWidth={2} />
            {showLS && (
              <Line type="monotone" dataKey="long" name="Nur Longs" stroke="#30D158"
                dot={false} strokeWidth={1.5} />
            )}
            {showLS && (
              <Line type="monotone" dataKey="short" name="Nur Shorts" stroke="#FF6482"
                dot={false} strokeWidth={1.5} />
            )}
            {showCoins && coins.map((c, idx) => (
              <Line key={c} type="monotone" dataKey={`c_${c}`} name={c.replace('USDT', '')}
                stroke={COIN_COLORS[idx % COIN_COLORS.length]} dot={false} strokeWidth={1} />
            ))}
            {liqs.map((p, idx) => (
              <ReferenceDot key={idx} x={p.i} y={p.equity} r={4} fill="#FF453A" stroke="#fff" strokeWidth={1} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="bt-hint" style={{ marginTop: 6 }}>
        Erkenne: konstantes Wachstum vs. Glückstreffer, wann Drawdowns entstehen, ob Longs oder
        Shorts den Gewinn tragen und welche Coins die Strategie tragen. Rote Punkte = Liquidationen.
      </div>
    </div>
  );
}
