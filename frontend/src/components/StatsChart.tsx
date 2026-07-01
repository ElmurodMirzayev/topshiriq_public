import React from 'react';
import type { StatsTimelinePoint } from '../types/models';

interface StatsChartProps {
  data: StatsTimelinePoint[];
}

// Внутренняя система координат SVG (масштабируется по ширине контейнера).
const VB_W = 1000;
const VB_H = 340;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;
const CHART_H = VB_H - PAD_TOP - PAD_BOTTOM;

// Короткая подпись даты бакета: DD/MM.
function shortDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

// Минималистичный inline SVG-график динамики без внешних зависимостей.
// Для каждого бакета — сгруппированные столбцы: отправлено / принято / доработка.
function StatsChart({ data }: StatsChartProps) {
  const n = data.length;
  const maxVal = data.reduce(
    (m, p) => Math.max(m, p.submitted_count, p.approved_count, p.rework_count),
    0
  );

  // Пустой период не должен ломать страницу: показываем ось и подпись.
  if (n === 0 || maxVal === 0) {
    return (
      <div className="stats-chart-empty">
        <p className="stats-chart-empty-text">Бу давр учун маълумот йўқ</p>
      </div>
    );
  }

  const groupW = VB_W / n;
  const barW = Math.max(1, (groupW * 0.7) / 3);
  const gap = barW * 0.1;
  const scale = (v: number) => (v / maxVal) * CHART_H;

  // Подписи по оси X: показываем не более ~6, чтобы не было каши.
  const labelStep = Math.max(1, Math.ceil(n / 6));

  return (
    <div className="stats-chart">
      <svg
        className="stats-chart-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Динамика отчётов по периоду"
      >
        {/* базовая линия оси X */}
        <line
          x1={0}
          y1={PAD_TOP + CHART_H}
          x2={VB_W}
          y2={PAD_TOP + CHART_H}
          className="stats-chart-axis"
        />
        {data.map((p, i) => {
          const cx = i * groupW + groupW / 2;
          const series = [
            { v: p.submitted_count, cls: 'bar-submitted' },
            { v: p.approved_count, cls: 'bar-approved' },
            { v: p.rework_count, cls: 'bar-rework' },
          ];
          const totalW = barW * 3 + gap * 2;
          const startX = cx - totalW / 2;
          return (
            <g key={p.date}>
              {series.map((s, si) => {
                const h = scale(s.v);
                const x = startX + si * (barW + gap);
                const y = PAD_TOP + CHART_H - h;
                return (
                  <rect
                    key={s.cls}
                    className={`stats-bar ${s.cls}`}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                  />
                );
              })}
              {i % labelStep === 0 && (
                <text
                  className="stats-chart-xlabel"
                  x={cx}
                  y={VB_H - 8}
                  textAnchor="middle"
                >
                  {shortDate(p.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="stats-legend">
        <span className="stats-legend-item">
          <span className="stats-legend-dot legend-submitted" /> Топширилди
        </span>
        <span className="stats-legend-item">
          <span className="stats-legend-dot legend-approved" /> Қабул қилинди
        </span>
        <span className="stats-legend-item">
          <span className="stats-legend-dot legend-rework" /> Қайта ишлашга
        </span>
      </div>
    </div>
  );
}

export default StatsChart;
