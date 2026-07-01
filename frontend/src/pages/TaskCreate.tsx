import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTask } from '../api/api';
import { REPORT_FORMAT_OPTIONS } from '../constants/status';
import { getApiErrorMessage } from '../utils/apiError';
import type { ReportFormat } from '../types/models';

interface FormData {
  name: string;
  description: string;
  reportFormat: ReportFormat[];
  deadline: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

function TaskCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({ name: '', description: '', reportFormat: [], deadline: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const now = new Date();
  const fmtDate = now.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtTime = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name as keyof FormData]) setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleCheck = (v: ReportFormat) => {
    setFormData((p) => {
      const fmts = p.reportFormat.includes(v) ? p.reportFormat.filter((f) => f !== v) : [...p.reportFormat, v];
      return { ...p, reportFormat: fmts };
    });
    if (errors.reportFormat) setErrors((p) => ({ ...p, reportFormat: undefined }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!formData.name.trim()) e.name = 'Номини киритинг';
    if (!formData.description.trim()) e.description = 'Мазмунини киритинг';
    if (formData.reportFormat.length === 0) e.reportFormat = 'Камида битта ҳисобот шакли танланг';
    if (!formData.deadline) e.deadline = 'Ижро муддатини танланг';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createTask({
        name: formData.name.trim(),
        description: formData.description.trim(),
        report_format: formData.reportFormat,
        deadline: new Date(formData.deadline).toISOString(),
      });
      navigate('/');
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Хатолик юз берди'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Орқага
        </button>
        <h1 className="header-title create-title">Топшириқ яратиш</h1>
      </div>
      <div className="content">
        <div className="form-container">
          <div className="form-info">
            <span className="form-info-text">
              Топшириқ. Сана: {fmtDate} {fmtTime}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Номи *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Топшириқ номини киритинг"
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Мазмуни *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Топшириқ мазмунини киритинг"
              rows={4}
              className={`form-textarea ${errors.description ? 'form-input-error' : ''}`}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Ҳисобот шакли *</label>
            <div className="checkbox-group">
              {REPORT_FORMAT_OPTIONS.map((o) => (
                <label key={o.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.reportFormat.includes(o.value)}
                    onChange={() => handleCheck(o.value)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">{o.label}</span>
                </label>
              ))}
            </div>
            {errors.reportFormat && <span className="error-text">{errors.reportFormat}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Ижро муддати *</label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className={`form-input ${errors.deadline ? 'form-input-error' : ''}`}
            />
            {errors.deadline && <span className="error-text">{errors.deadline}</span>}
          </div>

          {submitError && (
            <div className="submit-error">
              <p>❌ {submitError}</p>
            </div>
          )}
          <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Сақланмоқда...' : '✅ Тасдиқлаш'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskCreate;
