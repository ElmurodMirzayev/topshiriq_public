import React, { useCallback, useEffect, useState } from 'react';
import { getStatsSummary, getStatsTimeline } from '../api/api';
import StatsChart from '../components/StatsChart';
import { formatReviewTime } from '../utils/format';
import type { StatsPeriod, StatsSummary, StatsTimelinePoint } from '../types/models';

// Переключатели периода — скользящее окно от текущего момента.
const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: '1w', label: '1 ҳафта' },
  { value: '1m', label: '1 ой' },
  { value: '2m', label: '2 ой' },
  { value: '6m', label: '6 ой' },
  { value: '1y', label: '1 йил' },
];

// Метрика-карточка. tone задаёт цвет числа по правилам §12 гида.
type Tone = 'green' | 'orange' | 'red' | 'neutral';

function MetricCard({ value, label, tone }: { value: string | number; label: string; tone: Tone }) {
  const toneClass =
    tone === 'green' ? 'stat-green' : tone === 'orange' ? 'stat-orange' : tone === 'red' ? 'stat-red' : '';
  return (
    <div className="stat-item">
      <span className={`stat-number ${toneClass}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Stats() {
  const [period, setPeriod] = useState<StatsPeriod>('1w');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeline, setTimeline] = useState<StatsTimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (p: StatsPeriod) => {
    try {
      setLoading(true);
      // Параллельный запрос сводки и динамики.
      const [s, t] = await Promise.all([getStatsSummary(p), getStatsTimeline(p)]);
      setSummary(s);
      setTimeline(t);
      setError(null);
    } catch {
      if (!window.Telegram?.WebApp?.initData) {
        // Demo-режим вне Telegram: не показываем ошибку, оставляем пустое.
        setSummary(null);
        setTimeline([]);
        setError(null);
      } else {
        setError('Хатолик');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [fetchStats, period]);

  return (
    <div className="page">
      <div className="header">
        <h1 className="header-title">Статистика</h1>
      </div>
      <div className="content content-with-tabs">
        {/* Переключатели периода */}
        <div className="stats-periods">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`stats-period-btn ${period === p.value ? 'stats-period-active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        )}

        {error && (
          <div className="error-container">
            <p>❌ {error}</p>
          </div>
        )}

        {!loading && !error && summary && (
          <>
            {/* Карточки метрик */}
            <div className="stats-card">
              <div className="stats-title">Кўрсаткичлар</div>
              <div className="stats-row">
                <MetricCard value={summary.total_tasks_created} label="Топшириқлар яратилди" tone="neutral" />
                <MetricCard value={summary.total_reports_submitted} label="Ҳисоботлар топширилди" tone="neutral" />
                <MetricCard value={summary.approved_count} label="Қабул қилинди" tone="green" />
                <MetricCard value={summary.rework_count} label="Қайта ишлашга юборилди" tone="red" />
                <MetricCard value={summary.reported_count} label="Кутилмоқда" tone="orange" />
                <MetricCard
                  value={formatReviewTime(summary.avg_review_time_hours)}
                  label="Ўртача кўриб чиқиш вақти"
                  tone="neutral"
                />
              </div>
              <div className="stats-meta-row">
                <span>Фаол ходимлар: {summary.active_employees_count}</span>
                <span>Қайта ишлаш улуши: {Math.round(summary.rework_rate * 100)}%</span>
              </div>
            </div>

            {/* График динамики */}
            <div className="stats-card">
              <div className="stats-title">Динамика</div>
              <StatsChart data={timeline} />
            </div>

            {/* Топ ходимлар */}
            <div className="stats-card">
              <div className="stats-title">Топ ходимлар</div>
              {summary.top_employees.length === 0 ? (
                <p className="stats-empty-text">Бу давр учун маълумот йўқ</p>
              ) : (
                <div className="stats-top-list">
                  {summary.top_employees.map((e, i) => (
                    <div key={e.employee_id} className="stats-top-row">
                      <span className="stats-top-rank">{i + 1}</span>
                      <span className="stats-top-name">{e.employee_name}</span>
                      <span className="stats-top-counts">
                        <span className="stats-top-approved">{e.approved_count}</span>
                        {e.rework_count > 0 && <span className="stats-top-rework">{e.rework_count}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Stats;
