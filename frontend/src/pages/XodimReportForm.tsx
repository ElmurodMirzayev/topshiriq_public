import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getXodimTaskDetail, submitReportFiles } from '../api/api';
import {
  getFileUploadSupport,
  UPLOAD_ERROR_GENERIC,
  UPLOAD_ERROR_OUTDATED,
} from '../utils/telegram';
import { ASSIGNMENT_STATUS } from '../constants/status';
import { formatFileSize } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';
import type { ReportFormat, XodimTask } from '../types/models';

type FieldKey = ReportFormat; // 'video' | 'audio' | 'rasm' | 'matn'
type FieldErrors = Partial<Record<FieldKey, string | null>>;

interface RasmPreview {
  file: File;
  url: string;
}

function XodimReportForm() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const id = Number(taskId);

  const [task, setTask] = useState<XodimTask | null>(null);
  const [comment, setComment] = useState('');
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [rasmFiles, setRasmFiles] = useState<File[]>([]);
  const [matnFiles, setMatnFiles] = useState<File[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // Live upload progress (0–100). Null until an upload starts.
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Per-field upload failure messages (shown when Telegram fails to deliver a file).
  const [uploadErrors, setUploadErrors] = useState<FieldErrors>({});
  // Detect once whether the current Telegram client can deliver files at all.
  const fileSupport = useMemo(() => getFileUploadSupport(), []);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hidden file input refs — we trigger them from styled buttons so the
  // native picker opens reliably inside the Telegram WebView.
  const videoInputRef = useRef<HTMLInputElement>(null);
  const rasmInputRef = useRef<HTMLInputElement>(null);
  const matnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getXodimTaskDetail(id).then(setTask).catch(() => {});
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const needs = (type: ReportFormat): boolean => !!task?.report_format?.includes(type);

  // ── Generic file selection ──
  // Telegram's (especially Android) WebView frequently fails to fire `change`
  // on a native <input type="file"> the second time, and the `multiple`
  // attribute is unreliable there. To make selection robust we:
  //  1. trigger a hidden input from a button,
  //  2. reset the input value before opening so re-selecting the same file fires,
  //  3. APPEND the picked files to existing state (de-duplicated) so users can
  //     add files one at a time even when multi-select doesn't work.
  const openPicker = (ref: React.RefObject<HTMLInputElement | null>, errorKey: FieldKey) => {
    // Block selection up front on clients that can't deliver files, instead of
    // letting the user pick something that silently never arrives.
    if (!fileSupport.supported) {
      setUploadErrors((p) => ({ ...p, [errorKey]: UPLOAD_ERROR_OUTDATED }));
      return;
    }
    setUploadErrors((p) => ({ ...p, [errorKey]: null }));
    if (errorKey && errors[errorKey]) setErrors((p) => ({ ...p, [errorKey]: null }));
    if (ref.current) {
      ref.current.value = '';
      ref.current.click();
    }
  };

  const addFiles =
    (setter: React.Dispatch<React.SetStateAction<File[]>>, errorKey: FieldKey) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files || []);
      // Reset immediately so picking the same file again still triggers change.
      e.target.value = '';

      // The change event fired but Telegram delivered nothing — treat as failure
      // and surface a clear message rather than pretending a file was attached.
      if (picked.length === 0) {
        setUploadErrors((p) => ({
          ...p,
          [errorKey]: fileSupport.supported ? UPLOAD_ERROR_GENERIC : UPLOAD_ERROR_OUTDATED,
        }));
        return;
      }

      // Only keep files that actually carry data. A 0-byte/empty File usually
      // means the WebView could not read the underlying file.
      const valid = picked.filter((f) => f && typeof f.size === 'number' && f.size > 0);
      if (valid.length === 0) {
        setUploadErrors((p) => ({
          ...p,
          [errorKey]: fileSupport.supported ? UPLOAD_ERROR_GENERIC : UPLOAD_ERROR_OUTDATED,
        }));
        return;
      }

      setter((prev) => {
        const merged = [...prev];
        valid.forEach((f) => {
          const dup = merged.some(
            (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified,
          );
          if (!dup) merged.push(f);
        });
        return merged;
      });
      setUploadErrors((p) => ({ ...p, [errorKey]: null }));
      if (errorKey && errors[errorKey]) setErrors((p) => ({ ...p, [errorKey]: null }));
    };

  const removeFile = (setter: React.Dispatch<React.SetStateAction<File[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  // Stable object URLs for image previews (avoids recreating/leaking on every render).
  const rasmPreviews: RasmPreview[] = useMemo(
    () => rasmFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [rasmFiles],
  );
  useEffect(() => {
    return () => {
      rasmPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [rasmPreviews]);

  // ── Audio Recording ──
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.current.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch {
      alert('Микрофонга рухсат берилмади');
    }
  };

  const stopRec = () => {
    if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const deleteRec = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordTime(0);
  };

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Validate ──
  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (needs('video') && videoFiles.length === 0) e.video = 'Видео юкланг';
    if (needs('audio') && !audioBlob) e.audio = 'Аудио ёзинг';
    if (needs('rasm') && rasmFiles.length === 0) e.rasm = 'Расм юкланг';
    if (needs('matn') && matnFiles.length === 0) e.matn = 'Файл юкланг';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setUploadProgress(0);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append('comment', comment);
      const types: ReportFormat[] = [];
      videoFiles.forEach((f) => {
        formData.append('files', f);
        types.push('video');
      });
      if (audioBlob) {
        formData.append('files', audioBlob, 'audio_record.webm');
        types.push('audio');
      }
      rasmFiles.forEach((f) => {
        formData.append('files', f);
        types.push('rasm');
      });
      matnFiles.forEach((f) => {
        formData.append('files', f);
        types.push('matn');
      });
      formData.append('file_types', JSON.stringify(types));
      await submitReportFiles(id, formData, setUploadProgress);
      navigate(`/tasks/${id}`);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Хатолик юз берди'));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (!task) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(`/tasks/${id}`)}>← Орқага</button>
        <h1 className="header-title create-title">Ҳисобот топшириш</h1>
      </div>
      <div className="content">
        <div className="detail-card">
          <h3 className="detail-name">№{task.number} {task.name}</h3>
          <p className="detail-desc">{task.description}</p>
        </div>

        {task.my_status === ASSIGNMENT_STATUS.REWORK && task.review_comment && (
          <div className="detail-card review-feedback">
            <h4 className="stats-title">↩️ Раҳбар изоҳи</h4>
            <p className="detail-desc">{task.review_comment}</p>
          </div>
        )}

        <div className="form-container">
          {!fileSupport.supported && (
            <div className="update-warning">
              ⚠️ Telegram&apos;нинг эски версияси аниқланди. Файл юклаш ишламаслиги мумкин.
              Илтимос, Telegram&apos;ни энг сўнгги версиягача янгиланг.
            </div>
          )}
          {/* VIDEO */}
          {needs('video') && (
            <div className="form-group">
              <label className="form-label">🎥 Видео *</label>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                style={{ display: 'none' }}
                onChange={addFiles(setVideoFiles, 'video')}
              />
              <button type="button" className="upload-btn" onClick={() => openPicker(videoInputRef, 'video')}>
                🎥 Видео танлаш
              </button>
              {videoFiles.length > 0 && (
                <ul className="file-list">
                  {videoFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="file-item">
                      <span className="file-item-name">{f.name}</span>
                      <span className="file-item-size">{formatFileSize(f.size)}</span>
                      <button type="button" className="file-remove" onClick={() => removeFile(setVideoFiles, i)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
              {uploadErrors.video && <span className="error-text">{uploadErrors.video}</span>}
              {errors.video && <span className="error-text">{errors.video}</span>}
            </div>
          )}

          {/* AUDIO */}
          {needs('audio') && (
            <div className="form-group">
              <label className="form-label">🎧 Аудио *</label>
              {!audioBlob && !isRecording && (
                <button className="rec-btn" onClick={startRec}>🎙 Ёзишни бошлаш</button>
              )}
              {isRecording && (
                <div className="rec-active">
                  <div className="rec-indicator">🔴 Ёзилмоқда... {fmtTime(recordTime)}</div>
                  <button className="rec-stop-btn" onClick={stopRec}>⏹ Тўхтатиш</button>
                </div>
              )}
              {audioBlob && !isRecording && audioUrl && (
                <div className="rec-preview">
                  <audio src={audioUrl} controls className="audio-player" />
                  <button className="rec-delete-btn" onClick={deleteRec}>🗑 Ўчириш</button>
                </div>
              )}
              {errors.audio && <span className="error-text">{errors.audio}</span>}
            </div>
          )}

          {/* RASM (images) */}
          {needs('rasm') && (
            <div className="form-group">
              <label className="form-label">🖼 Расмлар *</label>
              <input
                ref={rasmInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={addFiles(setRasmFiles, 'rasm')}
              />
              <button type="button" className="upload-btn" onClick={() => openPicker(rasmInputRef, 'rasm')}>
                🖼 Расм танлаш
              </button>
              {rasmPreviews.length > 0 && (
                <div className="preview-row">
                  {rasmPreviews.map((p, i) => (
                    <div key={`${p.file.name}-${i}`} className="preview-item">
                      <img src={p.url} alt={p.file.name} className="preview-thumb" />
                      <button type="button" className="preview-remove" onClick={() => removeFile(setRasmFiles, i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {uploadErrors.rasm && <span className="error-text">{uploadErrors.rasm}</span>}
              {errors.rasm && <span className="error-text">{errors.rasm}</span>}
            </div>
          )}

          {/* MATN (documents) */}
          {needs('matn') && (
            <div className="form-group">
              <label className="form-label">📝 Ҳужжат (.doc, .pdf, .docx) *</label>
              <input
                ref={matnInputRef}
                type="file"
                accept=".doc,.docx,.pdf,.txt"
                multiple
                style={{ display: 'none' }}
                onChange={addFiles(setMatnFiles, 'matn')}
              />
              <button type="button" className="upload-btn" onClick={() => openPicker(matnInputRef, 'matn')}>
                📝 Ҳужжат танлаш
              </button>
              {matnFiles.length > 0 && (
                <ul className="file-list">
                  {matnFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="file-item">
                      <span className="file-item-name">{f.name}</span>
                      <span className="file-item-size">{formatFileSize(f.size)}</span>
                      <button type="button" className="file-remove" onClick={() => removeFile(setMatnFiles, i)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
              {uploadErrors.matn && <span className="error-text">{uploadErrors.matn}</span>}
              {errors.matn && <span className="error-text">{errors.matn}</span>}
            </div>
          )}

          {/* COMMENT */}
          <div className="form-group">
            <label className="form-label">💬 Изоҳ</label>
            <textarea
              className="form-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Қўшимча изоҳ ёзинг..."
              rows={3}
            />
          </div>

          {submitError && (
            <div className="submit-error">
              <p>❌ {submitError}</p>
            </div>
          )}
          {submitting && uploadProgress !== null && (
            <div className="upload-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className="upload-progress-label">
                {uploadProgress < 100
                  ? `Юкланмоқда... ${uploadProgress}%`
                  : 'Сервер қайта ишламоқда...'}
              </span>
            </div>
          )}
          <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? uploadProgress !== null && uploadProgress < 100
                ? `Юкланмоқда... ${uploadProgress}%`
                : 'Юборилмоқда...'
              : '✅ Тасдиқлаш'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default XodimReportForm;
