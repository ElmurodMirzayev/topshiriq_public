import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { approveReport, getEmployeeReport, reworkReport } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { ASSIGNMENT_STATUS, getReportViewBadge } from '../constants/status';
import { formatDateTime, formatFileSize } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import type { EmployeeReport, ReportFile } from '../types/models';

function ReportView() {
  const { taskId, employeeId } = useParams<{ taskId: string; employeeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Решение по отчёту (принять/на доработку) доступно только руководителю.
  const canReview = user?.role === 'boshliq';

  const [data, setData] = useState<EmployeeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullImg, setFullImg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRework, setShowRework] = useState(false);
  const [reworkComment, setReworkComment] = useState('');
  const [reworkError, setReworkError] = useState<string | null>(null);
  const [showApprove, setShowApprove] = useState(false);

  const load = useCallback(() => {
    if (!taskId || !employeeId) return;
    setLoading(true);
    getEmployeeReport(Number(taskId), Number(employeeId))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Бэкенд отдаёт готовую ссылку в file.file_url:
  //  - для S3 это абсолютный presigned-URL;
  //  - для локального хранилища это относительный путь /uploads/<имя>.
  // Старые записи без file_url открываем по file_path (обратная совместимость).
  const fileUrl = (file: ReportFile): string => {
    const base = process.env.REACT_APP_API_URL || '';
    const url = file.file_url;
    if (url) return /^https?:\/\//i.test(url) ? url : `${base}${url}`;
    return `${base}/uploads/${file.file_path}`;
  };

  const handleApprove = async () => {
    if (!taskId || !employeeId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await approveReport(Number(taskId), Number(employeeId));
      setShowApprove(false);
      await load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Қабул қилишда хатолик юз берди'));
    } finally {
      setActionLoading(false);
    }
  };

  const submitRework = async () => {
    if (!taskId || !employeeId) return;
    if (!reworkComment.trim()) {
      setReworkError('Изоҳ киритилиши шарт');
      return;
    }
    setActionLoading(true);
    setReworkError(null);
    setActionError(null);
    try {
      await reworkReport(Number(taskId), Number(employeeId), reworkComment.trim());
      setShowRework(false);
      setReworkComment('');
      await load();
    } catch (err) {
      setReworkError(getApiErrorMessage(err, 'Юборишда хатолик юз берди'));
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
        <p>Ҳисобот топилмади</p>
      </div>
    );
  }

  const { employee: emp, assignment: asn, report } = data;
  const videos = report.files.filter((f) => f.file_type === 'video');
  const audios = report.files.filter((f) => f.file_type === 'audio');
  const images = report.files.filter((f) => f.file_type === 'rasm');
  const docs = report.files.filter((f) => f.file_type === 'matn');
  const badge = getReportViewBadge(asn.status);

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Орқага
        </button>
        <h1 className="header-title create-title">Ҳисобот</h1>
      </div>
      <div className="content">
        {/* Employee info */}
        <div className="detail-card">
          <h3 className="detail-name">{emp.full_name}</h3>
          <div className="detail-row">
            <span className="detail-label">Лавозим:</span>
            <span>{emp.position}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Ҳудуд:</span>
            <span>{emp.region}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Қабул қилди:</span>
            <span>{formatDateTime(asn.accepted_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Ҳисобот:</span>
            <span>{formatDateTime(asn.reported_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Статус:</span>
            <span>
              <span className={badge.className}>{badge.label}</span>
            </span>
          </div>
          {asn.reviewed_at && (
            <div className="detail-row">
              <span className="detail-label">Кўриб чиқилди:</span>
              <span>{formatDateTime(asn.reviewed_at)}</span>
            </div>
          )}
        </div>

        {/* Existing rework feedback */}
        {asn.status === ASSIGNMENT_STATUS.REWORK && asn.review_comment && (
          <div className="detail-card review-feedback">
            <h4 className="stats-title">↩️ Қайта ишлашга юборилди</h4>
            <p className="detail-desc">{asn.review_comment}</p>
          </div>
        )}

        {/* Comment */}
        {report.comment && (
          <div className="detail-card">
            <h4 className="stats-title">💬 Изоҳ</h4>
            <p className="detail-desc">{report.comment}</p>
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div className="detail-card">
            <h4 className="stats-title">🎥 Видео</h4>
            {videos.map((v) => (
              <video key={v.id} src={fileUrl(v)} controls className="report-video" />
            ))}
          </div>
        )}

        {/* Audio */}
        {audios.length > 0 && (
          <div className="detail-card">
            <h4 className="stats-title">🎧 Аудио</h4>
            {audios.map((a) => (
              <audio key={a.id} src={fileUrl(a)} controls className="report-audio" />
            ))}
          </div>
        )}

        {/* Images */}
        {images.length > 0 && (
          <div className="detail-card">
            <h4 className="stats-title">🖼 Расмлар</h4>
            <div className="report-images">
              {images.map((img) => (
                <img
                  key={img.id}
                  src={fileUrl(img)}
                  alt={img.file_name}
                  className="report-thumb"
                  onClick={() => setFullImg(fileUrl(img))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {docs.length > 0 && (
          <div className="detail-card">
            <h4 className="stats-title">📝 Ҳужжатлар</h4>
            {docs.map((d) => (
              <a key={d.id} href={fileUrl(d)} target="_blank" rel="noopener noreferrer" className="doc-link">
                📄 {d.file_name} ({formatFileSize(d.file_size)})
              </a>
            ))}
          </div>
        )}

        {/* Review decision (Boshliq only) */}
        {canReview && (
          <div className="action-section">
            {actionError && (
              <div className="submit-error">
                <p>❌ {actionError}</p>
              </div>
            )}
            {asn.status === ASSIGNMENT_STATUS.REPORTED && (
              <div className="review-actions">
                <button
                  className="action-btn action-green"
                  onClick={() => {
                    setShowApprove(true);
                    setActionError(null);
                  }}
                  disabled={actionLoading}
                >
                  ✅ Қабул қилиш
                </button>
                <button
                  className="action-btn action-rework"
                  onClick={() => {
                    setShowRework(true);
                    setReworkError(null);
                  }}
                  disabled={actionLoading}
                >
                  ↩️ Қайта ишлашга юбориш
                </button>
              </div>
            )}
            {asn.status === ASSIGNMENT_STATUS.APPROVED && (
              <div className="action-done">✅ Ҳисобот қабул қилинди. Қарор қабул қилинган.</div>
            )}
            {asn.status === ASSIGNMENT_STATUS.REWORK && (
              <div className="action-rework-done">↩️ Қайта ишлашга юборилди</div>
            )}
          </div>
        )}
      </div>

      {/* Rework comment modal */}
      {showRework && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowRework(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Қайта ишлашга юбориш</h3>
            <p className="modal-desc">Нимани тузатиш кераклигини ёзинг. Изоҳ ходимга кўрсатилади.</p>
            <textarea
              className="form-textarea"
              rows={4}
              value={reworkComment}
              onChange={(e) => {
                setReworkComment(e.target.value);
                if (reworkError) setReworkError(null);
              }}
              placeholder="Изоҳ киритинг..."
              autoFocus
            />
            {reworkError && <span className="error-text">{reworkError}</span>}
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowRework(false)} disabled={actionLoading}>
                Бекор қилиш
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={submitRework} disabled={actionLoading}>
                {actionLoading ? 'Юборилмоқда...' : 'Юбориш'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve confirmation modal */}
      {showApprove && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowApprove(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Ҳисоботни қабул қилиш</h3>
            <p className="modal-desc">
              Ҳисоботни қабул қилгач, қарорни ўзгартириб бўлмайди ва ходим уни қайта юбора олмайди. Давом этасизми?
            </p>
            {actionError && <span className="error-text">{actionError}</span>}
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowApprove(false)}
                disabled={actionLoading}
              >
                Бекор қилиш
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? 'Қабул қилинмоқда...' : '✅ Қабул қилиш'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen image */}
      {fullImg && (
        <div className="fullscreen-overlay" onClick={() => setFullImg(null)}>
          <img src={fullImg} alt="" className="fullscreen-img" />
          <button className="fullscreen-close" onClick={() => setFullImg(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default ReportView;
