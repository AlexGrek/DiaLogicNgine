import React, { useCallback, useState } from 'react';
import { Button, Input, Message } from 'rsuite';
import { LogIn, Sparkles, UserPlus } from 'lucide-react';
import { AuthUser, login, register } from '../../api/authApi';
import './LoginPage.css';

interface LoginPageProps {
  onAuth: (user: AuthUser) => void;
}

type Mode = 'login' | 'register';

const LoginPage: React.FC<LoginPageProps> = ({ onAuth }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const canSubmit = username.trim().length > 0 && password.length > 0 && !busy;

  const handleSubmit = useCallback(async () => {
    const name = username.trim();
    if (!name || !password) return;
    setBusy(true);
    setError(null);
    try {
      const user = isRegister
        ? await register(name, password)
        : await login(name, password);
      onAuth(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
      setBusy(false);
    }
  }, [username, password, isRegister, onAuth]);

  const switchMode = useCallback(() => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
  }, []);

  return (
    <div className="login-page" data-testid="login-page">
      <div className="login-orb login-orb--1" aria-hidden />
      <div className="login-orb login-orb--2" aria-hidden />

      <section className="login-card">
        <div className="login-badge">
          <Sparkles size={12} />
          Visual novel engine
        </div>
        <h1 className="login-title">🇺🇦 DiaLogic Ngine</h1>
        <p className="login-subtitle">
          {isRegister
            ? 'Create an account — your projects stay private to you.'
            : 'Sign in to your projects.'}
        </p>

        {error && (
          <Message type="error" showIcon className="login-error">
            {error}
          </Message>
        )}

        <div className="login-field">
          <label className="login-label" htmlFor="login-username">
            Username
          </label>
          <Input
            id="login-username"
            value={username}
            onChange={setUsername}
            placeholder="username"
            disabled={busy}
            data-testid="login-username"
          />
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="login-password">
            Password
          </label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="password"
            disabled={busy}
            onPressEnter={handleSubmit}
            data-testid="login-password"
          />
        </div>

        <Button
          appearance="primary"
          block
          loading={busy}
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="login-submit"
          data-testid="login-submit"
        >
          {isRegister ? (
            <>
              <UserPlus size={16} style={{ marginRight: 6 }} />
              Create account
            </>
          ) : (
            <>
              <LogIn size={16} style={{ marginRight: 6 }} />
              Sign in
            </>
          )}
        </Button>

        <p className="login-switch">
          {isRegister ? 'Already have an account?' : 'No account yet?'}{' '}
          <button
            type="button"
            className="login-switch-btn"
            onClick={switchMode}
            disabled={busy}
            data-testid="login-switch"
          >
            {isRegister ? 'Sign in' : 'Register for free'}
          </button>
        </p>
      </section>
    </div>
  );
};

export default LoginPage;
