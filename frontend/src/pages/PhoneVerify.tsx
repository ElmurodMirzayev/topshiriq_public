import React, { useEffect, useRef, useState } from 'react';
import { checkBinding } from '../api/api';
import { useAuth } from '../context/AuthContext';

type Status = 'idle' | 'sending' | 'polling' | 'success' | 'not_found' | 'error';

function PhoneVerify() {
  const { applyBinding } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  // После отправки контакта бот сам определяет роль по номеру и сохраняет
  // Telegram ID. Фронтенд опрашивает check-binding и получает готовую роль.
  const startPolling = () => {
    setStatus('polling');
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const r = await checkBinding();
        if (r.bound) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('success');
          setTimeout(() => applyBinding(r), 1200);
          return;
        }
      } catch {
        /* продолжаем опрос */
      }
      if (attempts >= 15) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus('not_found');
        setErrMsg('Сиз тизимда рўйхатдан ўтмагансиз');
      }
    }, 2000);
  };

  const handleRequestContact = () => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.requestContact) {
      setStatus('error');
      setErrMsg('requestContact мавжуд эмас. Telegram ни янгиланг.');
      return;
    }
    setStatus('sending');
    tg.requestContact((sent) => {
      if (sent) startPolling();
      else setStatus('idle');
    });
  };

  const reset = () => {
    setStatus('idle');
    setErrMsg('');
  };

  return (
    <div className="page">
      <div className="phone-verify-container">
        <div className="phone-verify-icon">📱</div>
        <h2 className="phone-verify-title">Тизимга кириш</h2>
        <p className="phone-verify-desc">
          Тизимга кириш учун телефон рақамингизни тасдиқланг. Роль автоматик аниқланади.
        </p>

        {status === 'idle' && (
          <button className="phone-verify-btn" onClick={handleRequestContact}>
            📞 Телефон рақамини тасдиқлаш
          </button>
        )}

        {status === 'sending' && (
          <div className="phone-verify-status">
            <div className="spinner" />
            <p>Юборилмоқда...</p>
          </div>
        )}
        {status === 'polling' && (
          <div className="phone-verify-status">
            <div className="spinner" />
            <p>Текширилмоқда...</p>
            <p className="phone-verify-hint">Бот жавоб беришини кутинг</p>
          </div>
        )}
        {status === 'success' && (
          <div className="phone-verify-success">
            <div className="phone-verify-success-icon">✅</div>
            <p>Муваффақиятли!</p>
            <p className="phone-verify-hint">Тизимга кирилмоқда...</p>
          </div>
        )}
        {(status === 'error' || status === 'not_found') && (
          <div className="phone-verify-error">
            <p>❌ {errMsg}</p>
            {status === 'not_found' && (
              <p className="phone-verify-hint">Илтимос, администратор билан боғланинг.</p>
            )}
            <button className="phone-verify-btn phone-verify-retry" onClick={reset}>Қайта уриниш</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhoneVerify;
