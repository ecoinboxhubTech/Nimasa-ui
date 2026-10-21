import { useMemo, useState } from 'react';
import type { DataKind, Point } from '../types';
import { KIND_LABEL } from '../config';
import { formatDateTime, formatDayTick, formatTimeShort } from '../lib/time';

interface Props {
  points: Point[];
  unit: string;
  decimals: number;
  now: number;
  label: string;
  threshold?: { value: number; label: string };
  staleSince?: number | null;
}

const W = 720, H = 300, M = { l: 48, r: 16, t: 16, b: 34 };

export default function TrendChart({ points, unit, decimals, now, label, threshold, staleSince }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const g = useMemo(() => {
    if (!points.length) return null;
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const vals = points.filter((p) => p.value != null).map((p) => p.value as number);
    if (!vals.length) return null;
    let lo = Math.min(...vals, threshold?.value ?? Infinity), hi = Math.max(...vals, threshold?.value ?? -Infinity);
    const pad = (hi - lo || 1) * 0.15;
    lo = Math.max(0, lo - pad); hi += pad;
    const x = (t: number) => M.l + ((t - t0) / (t1 - t0 || 1)) * (W - M.l - M.r);
    const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);

    // line segments: consecutive non-null points of the same class. A null breaks the line (gaps stay visible).
    const segs: { d: string; forecast: boolean }[] = [];
    let cur: Point[] = [];
    const flush = () => {
      if (cur.length) segs.push({ d: cur.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.value as number).toFixed(1)}`).join(''), forecast: cur[0].kind === 'forecast' });
      cur = [];
    };
    let prevValid: Point | null = null;
    for (const p of points) {
      if (p.value == null) { flush(); continue; }
      if (cur.length && (cur[0].kind === 'forecast') !== (p.kind === 'forecast')) {
        const bridge = cur[cur.length - 1];
        flush();
        if (p.kind === 'forecast') cur = [bridge]; // visually connect last observed to first forecast
      }
      cur.push(p);
      prevValid = p;
    }
    flush();
    void prevValid;

    // gap bands: runs of nulls
    const gaps: { x0: number; x1: number }[] = [];
    for (let i = 0; i < points.length; i++) {
      if (points[i].value == null) {
        let j = i;
        while (j < points.length && points[j].value == null) j++;
        const a = points[Math.max(0, i - 1)].t, b = points[Math.min(points.length - 1, j)].t;
        gaps.push({ x0: x(a), x1: x(b) });
        i = j;
      }
    }

    // ticks
    const span = t1 - t0, H1 = 3600000;
    const step = span <= 36 * H1 ? 6 * H1 : span <= 100 * H1 ? 12 * H1 : 24 * H1;
    const off = H1; // WAT = UTC+1
    const ticks: number[] = [];
    for (let t = Math.ceil((t0 + off) / step) * step - off; t <= t1; t += step) ticks.push(t);
    const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
    return { x, y, segs, gaps, ticks, yTicks, step, t0, t1 };
  }, [points, threshold]);

  if (!g) return null;
  const { x, y } = g;
  const hp = hover != null ? points[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const t = g.t0 + ((px - M.l) / (W - M.l - M.r)) * (g.t1 - g.t0);
    let best = 0, bd = Infinity;
    points.forEach((p, i) => { const d = Math.abs(p.t - t); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };

  const nowInRange = now >= g.t0 && now <= g.t1;
  const tickLabel = (t: number) => (g.step < 24 * 3600000 ? formatTimeShort(t) : formatDayTick(t));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} over time. Solid line: past values. Dashed line: forecast. Shaded bands: missing data.`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="chart">
        {g.yTicks.map((v, i) => (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="axis">{v.toFixed(decimals)}</text>
          </g>
        ))}
        {g.ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor="middle" className="axis">{tickLabel(t)}</text>
        ))}
        <text x={12} y={M.t + 4} className="axis unit" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">{unit}</text>

        {g.gaps.map((gp, i) => (
          <rect key={i} x={gp.x0} y={M.t} width={Math.max(2, gp.x1 - gp.x0)} height={H - M.t - M.b} className="gap-band"><title>Missing data (not estimated)</title></rect>
        ))}
        {staleSince != null && staleSince < g.t1 && (
          <rect x={x(Math.max(staleSince, g.t0))} y={M.t} width={Math.max(0, x(Math.min(now, g.t1)) - x(Math.max(staleSince, g.t0)))} height={H - M.t - M.b} className="stale-band"><title>No recent data from the source</title></rect>
        )}

        {threshold && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={y(threshold.value)} y2={y(threshold.value)} className="threshold" />
            <text x={W - M.r - 4} y={y(threshold.value) - 5} textAnchor="end" className="axis threshold-label">{threshold.label}</text>
          </g>
        )}
        {nowInRange && (
          <g>
            <line x1={x(now)} x2={x(now)} y1={M.t} y2={H - M.b} className="now-line" />
            <text x={x(now) + 4} y={M.t + 10} className="axis">now</text>
          </g>
        )}
        {g.segs.map((s, i) => <path key={i} d={s.d} className={s.forecast ? 'line forecast' : 'line'} />)}
        {hp && (
          <g>
            <line x1={x(hp.t)} x2={x(hp.t)} y1={M.t} y2={H - M.b} className="hover-line" />
            {hp.value != null && <circle cx={x(hp.t)} cy={y(hp.value)} r={4.5} className="hover-dot" />}
          </g>
        )}
      </svg>
      <div className="chart-readout" aria-live="polite">
        {hp ? (
          <>
            <strong>{hp.value == null ? 'No data' : `${hp.value.toFixed(decimals)} ${unit}`}</strong>
            <span>{formatDateTime(hp.t)}</span>
            <span className={`badge kind-${hp.kind as DataKind}`}>{KIND_LABEL[hp.kind]}</span>
            {hp.value == null && <span className="muted">Value missing at source; not estimated.</span>}
          </>
        ) : (
          <span className="muted">Hover or touch the chart to read exact values.</span>
        )}
      </div>
      <div className="chart-legend">
        <span><i className="sw solid" /> Past values</span>
        <span><i className="sw dashed" /> Forecast</span>
        <span><i className="sw gapsw" /> Missing data</span>
        {staleSince != null && <span><i className="sw stalesw" /> No recent data</span>}
      </div>
    </div>
  );
}
