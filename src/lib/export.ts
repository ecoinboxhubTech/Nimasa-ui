import type { DatasetMeta, Location, Point } from '../types';
import { APP_NAME, KIND_LABEL, TIMEZONE, TZ_LABEL } from '../config';
import { formatDateTime } from './time';

export type ExportFormat = 'png' | 'jpg' | 'pdf';

export interface ReportInput {
  points: Point[];
  dataset: DatasetMeta;
  location: Location;
  sourceName: string;
  now: number;
  threshold?: { value: number; label: string };
}

const W = 1200, H = 700;
const M = { l: 80, r: 30, t: 130, b: 120 };

/** Draw a self-contained chart report (title, chart, source line) on a canvas. Missing values stay gaps; nothing is interpolated. */
function renderReport({ points, dataset, location, sourceName, now, threshold }: ReportInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  const font = '"Segoe UI", Arial, sans-serif';

  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#0b2a45';
  c.font = `700 30px ${font}`;
  c.fillText(`${dataset.label} · ${location.name}`, M.l, 52);
  c.fillStyle = '#51657a';
  c.font = `16px ${font}`;
  c.fillText(`${APP_NAME} · ${dataset.description}`, M.l, 80);
  c.fillText(`Exported ${formatDateTime(Date.now())} · Times in ${TZ_LABEL} (UTC+1)`, M.l, 104);

  const vals = points.filter((p) => p.value != null).map((p) => p.value as number);
  if (!points.length || !vals.length) {
    c.font = `20px ${font}`;
    c.fillText('No data for this selection.', M.l, M.t + 40);
    return canvas;
  }
  const t0 = points[0].t, t1 = points[points.length - 1].t;
  let lo = Math.min(...vals, threshold?.value ?? Infinity), hi = Math.max(...vals, threshold?.value ?? -Infinity);
  const pad = (hi - lo || 1) * 0.15;
  lo = Math.max(0, lo - pad); hi += pad;
  const x = (t: number) => M.l + ((t - t0) / (t1 - t0 || 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);

  c.font = `14px ${font}`;
  c.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4;
    c.strokeStyle = '#e2e8f0';
    c.beginPath(); c.moveTo(M.l, y(v)); c.lineTo(W - M.r, y(v)); c.stroke();
    c.fillStyle = '#51657a';
    c.fillText(v.toFixed(dataset.decimals), M.l - 8, y(v) + 5);
  }
  c.save();
  c.translate(20, (M.t + H - M.b) / 2);
  c.rotate(-Math.PI / 2);
  c.textAlign = 'center';
  c.fillText(dataset.unit, 0, 0);
  c.restore();

  c.textAlign = 'center';
  const day = 24 * 3600000;
  const step = t1 - t0 <= 36 * 3600000 ? 6 * 3600000 : t1 - t0 <= 100 * 3600000 ? 12 * 3600000 : day;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    ...(step < day ? { hour: '2-digit', minute: '2-digit', hour12: false } : { weekday: 'short', day: 'numeric' }),
  });
  for (let t = Math.ceil((t0 + 3600000) / step) * step - 3600000; t <= t1; t += step) c.fillText(fmt.format(t), x(t), H - M.b + 24);

  // missing-data bands
  c.fillStyle = 'rgba(148,163,184,0.25)';
  for (let i = 0; i < points.length; i++) {
    if (points[i].value != null) continue;
    let j = i;
    while (j < points.length && points[j].value == null) j++;
    const a = x(points[Math.max(0, i - 1)].t), b = x(points[Math.min(points.length - 1, j)].t);
    c.fillRect(a, M.t, Math.max(2, b - a), H - M.t - M.b);
    i = j;
  }

  if (threshold) {
    c.strokeStyle = '#c2185b';
    c.setLineDash([6, 4]);
    c.beginPath(); c.moveTo(M.l, y(threshold.value)); c.lineTo(W - M.r, y(threshold.value)); c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#c2185b';
    c.textAlign = 'right';
    c.fillText(threshold.label, W - M.r - 4, y(threshold.value) - 6);
  }
  if (now >= t0 && now <= t1) {
    c.strokeStyle = '#94a3b8';
    c.beginPath(); c.moveTo(x(now), M.t); c.lineTo(x(now), H - M.b); c.stroke();
    c.fillStyle = '#51657a';
    c.textAlign = 'left';
    c.fillText('now', x(now) + 4, M.t + 14);
  }

  // line: solid for past values, dashed for forecast; a null breaks the line
  c.strokeStyle = '#0f6cbd';
  c.lineWidth = 2.5;
  c.lineJoin = 'round';
  let prev: Point | null = null;
  for (const p of points) {
    if (p.value == null) { prev = null; continue; }
    if (prev) {
      c.setLineDash(p.kind === 'forecast' ? [8, 6] : []);
      c.beginPath(); c.moveTo(x(prev.t), y(prev.value as number)); c.lineTo(x(p.t), y(p.value)); c.stroke();
    }
    prev = p;
  }
  c.setLineDash([]);
  c.lineWidth = 1;

  c.textAlign = 'left';
  c.fillStyle = '#51657a';
  c.font = `14px ${font}`;
  c.fillText('Solid: past values · Dashed: forecast · Shaded: missing data (not estimated)', M.l, H - 58);
  const kinds = [...new Set(points.map((p) => KIND_LABEL[p.kind]))].join(', ');
  c.fillText(`Source: ${sourceName} · Data type: ${kinds} · Units: ${dataset.unit}`, M.l, H - 34);
  c.fillText('Informational only. Not an official forecast, warning or navigation aid.', M.l, H - 12);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), type, quality));

/** Minimal single-page PDF with the report embedded as a JPEG (no library needed). */
function jpegToPdf(jpeg: Uint8Array, w: number, h: number): Blob {
  const pageW = 842, pageH = Math.round((842 * h) / w);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n: number, body: () => void) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };

  push('%PDF-1.4\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push('\nendstream');
  });
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  const xref = len;
  push(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => `${String(offsets[n]).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportChart(format: ExportFormat, input: ReportInput, baseName: string) {
  const canvas = renderReport(input);
  if (format === 'png') return save(await toBlob(canvas, 'image/png'), `${baseName}.png`);
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.92);
  if (format === 'jpg') return save(jpeg, `${baseName}.jpg`);
  save(jpegToPdf(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height), `${baseName}.pdf`);
}
