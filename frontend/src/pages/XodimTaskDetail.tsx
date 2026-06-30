import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { acceptTask, getXodimTaskDetail } from '../api/api';
import { ASSIGNMENT_STATUS, formatReportFormats, isActionable } from '../constants/status';
import { formatDateTime } from '../utils/format';
import type { XodimTask } from '../types/models';

function XodimTaskDetail() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const id = Number(taskId);

  const [data, setData] = useState<XodimTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getXodimTaskDetail(id)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await acceptTask(id);
      load();
    } catch {
      alert('Хатолик');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="error-screen">
        <p>Топилмади</p>
      </div>
    );
  }

  // Срок истёк — приём поручения и отправка отчёта недоступны.
  const isExpired = data.deadline ? new Date(data.deadline).getTime() < Date.now() : false;
  // Действия блокируются, только если работа ещё не завершена (не сдан/не принят отчёт).
  const lockActions = isExpired && isActionable(data.my_status);

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>← Орқага</button>
        <h1 className="header-title create-title">Топшириқ №{data.number}</h1>
      </div>
      <div className="content">
        <div className="detail-card">
          <h2 className="detail-name">{data.name}</h2>
          <p className="detail-desc">{data.description}</p>
          <div className="detail-row">
            <span className="detail-label">Яратилган:</span>
            <span>{formatDateTime(data.created_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Муддат:</span>
            <span className={lockActions ? 'deadline-overdue' : ''}>{formatDateTime(data.deadline)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Ҳисобот шакли:</span>
            <span>{formatReportFormats(data.report_format)}</span>
          </div>
        </div>

        {/* Раҳбар изоҳи — показывается при отправке на доработку */}
        {data.my_status === ASSIGNMENT_STATUS.REWORK && data.review_comment && (
          <div className="detail-card review-feedback">
            <h4 className="stats-title">↩️ Қайта ишлашга юборилди</h4>
            <p className="detail-desc">{data.review_comment}</p>
          </div>
        )}

        <div className="action-section">
          {lockActions ? (
            <div className="action-done action-expired">⏳ Топшириқ муддати тугаган</div>
          ) : (
            <>
              {data.my_status === ASSIGNMENT_STATUS.NONE && (
                <button className="action-btn action-green" onClick={handleAccept} disabled={actionLoading}>
                  {actionLoading ? '...' : '✅ Қабул қилиш'}
                </button>
              )}
              {data.my_status === ASSIGNMENT_STATUS.ACCEPTED && (
                <button className="action-btn action-orange" onClick={() => navigate(`/tasks/${id}/report`)}>
                  📤 Ҳисобот топшириш
                </button>
              )}
              {data.my_status === ASSIGNMENT_STATUS.REWORK && (
                <button className="action-btn action-orange" onClick={() => navigate(`/tasks/${id}/report`)}>
                  📤 Ҳисоботни қайта юбориш
                </button>
              )}
              {data.my_status === ASSIGNMENT_STATUS.REPORTED && (
                <div className="action-done">✅ Ҳисобот топширилди · текширилмоқда</div>
              )}
              {data.my_status === ASSIGNMENT_STATUS.APPROVED && (
                <div className="action-done">✅ Ҳисобот қабул қилинди</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default XodimTaskDetail;
