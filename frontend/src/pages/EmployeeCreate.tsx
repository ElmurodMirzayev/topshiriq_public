import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEmployee } from '../api/api';
import { getApiErrorMessage } from '../utils/apiError';

// Районы и города Қашқадарё вилояти (алфавитный порядок)
const REGIONS = [
  'Ғузор тумани',
  'Деҳқонобод тумани',
  'Қамаши тумани',
  'Қарши тумани',
  'Қарши шаҳри',
  'Касби тумани',
  'Китоб тумани',
  'Косон тумани',
  'Миришкор тумани',
  'Муборак тумани',
  'Нишон тумани',
  'Чироқчи тумани',
  'Шаҳрисабз тумани',
  'Шаҳрисабз шаҳри',
  'Яккабоғ тумани',
];

interface FormData {
  full_name: string;
  region: string;
  position: string;
  phone_number: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

/**
 * Страница «Ходим қўшиш».
 * Поля: Ф.И.О., Ҳудуд (select), Лавозим, Телефон.
 */
function EmployeeCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    region: '',
    position: '',
    phone_number: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Ф.И.О. ни киритинг';
    }
    if (!formData.region) {
      newErrors.region = 'Ҳудудни танланг';
    }
    if (!formData.position.trim()) {
      newErrors.position = 'Лавозимни киритинг';
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Телефон рақамни киритинг';
    } else {
      const digits = formData.phone_number.replace(/\D/g, '');
      if (digits.length < 9) {
        newErrors.phone_number = 'Телефон рақами нотўғри';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await createEmployee({
        full_name: formData.full_name.trim(),
        region: formData.region,
        position: formData.position.trim(),
        phone_number: formData.phone_number.trim(),
      });
      navigate('/employees');
    } catch (err) {
      console.error('Create employee error:', err);
      setSubmitError(getApiErrorMessage(err, 'Ходим қўшишда хатолик юз берди'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      {/* Заголовок */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/employees')}>← Орқага</button>
        <h1 className="header-title create-title">Ходим қўшиш</h1>
      </div>

      {/* Форма */}
      <div className="content">
        <div className="form-container">

          {/* 1. Ф.И.О. */}
          <div className="form-group">
            <label className="form-label">Ф.И.О. *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Тўлиқ исм-шарифни киритинг"
              className={`form-input ${errors.full_name ? 'form-input-error' : ''}`}
            />
            {errors.full_name && <span className="error-text">{errors.full_name}</span>}
          </div>

          {/* 2. Ҳудуд — select */}
          <div className="form-group">
            <label className="form-label">Ҳудуд *</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleInputChange}
              className={`form-select ${errors.region ? 'form-input-error' : ''}`}
            >
              <option value="">— Ҳудудни танланг —</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.region && <span className="error-text">{errors.region}</span>}
          </div>

          {/* 3. Лавозим */}
          <div className="form-group">
            <label className="form-label">Лавозим *</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              placeholder="Лавозимни киритинг"
              className={`form-input ${errors.position ? 'form-input-error' : ''}`}
            />
            {errors.position && <span className="error-text">{errors.position}</span>}
          </div>

          {/* 4. Телефон */}
          <div className="form-group">
            <label className="form-label">Телефон рақам *</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              placeholder="+998 90 123 45 67"
              className={`form-input ${errors.phone_number ? 'form-input-error' : ''}`}
            />
            {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
          </div>

          {/* Ошибка */}
          {submitError && (
            <div className="submit-error">
              <p>❌ {submitError}</p>
            </div>
          )}

          {/* Тасдиқлаш */}
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Сақланмоқда...' : '✅ Тасдиқлаш'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmployeeCreate;
