import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login } from '../api/api';
import type { BindingResult, Role, User } from '../types/models';

const VALID_ROLES: Role[] = ['boshliq', 'admin', 'xodim'];

function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && (VALID_ROLES as string[]).includes(role);
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  // true, если пользователь ещё не привязан и должен подтвердить телефон.
  needsPhone: boolean;
  // Применяет результат привязки телефона (определяет роль) к текущему пользователю.
  applyBinding: (result: BindingResult) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPhone, setNeedsPhone] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
    const initData = tg?.initData || '';

    if (initData) {
      login(initData)
        .then((u) => {
          if (isValidRole(u.role)) {
            setUser(u);
            setNeedsPhone(false);
          } else {
            // Роль не определена — требуется подтверждение телефона.
            setUser(u);
            setNeedsPhone(true);
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Аутентификация не удалась');
          setLoading(false);
        });
    } else {
      // Запуск вне Telegram (локальная разработка) — демо-пользователь.
      setUser({ telegram_id: 123, username: 'demo', first_name: 'Demo', role: 'boshliq' });
      setNeedsPhone(false);
      setLoading(false);
    }
  }, []);

  const applyBinding = useMemo(
    () =>
      (result: BindingResult): void => {
        const role: Role = isValidRole(result.role) ? result.role : 'xodim';
        setUser((prev) => ({
          telegram_id: result.telegram_id ?? prev?.telegram_id ?? 0,
          username: result.username ?? prev?.username,
          first_name: result.first_name ?? prev?.first_name,
          role,
        }));
        setNeedsPhone(false);
      },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, needsPhone, applyBinding }),
    [user, loading, error, needsPhone, applyBinding]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
