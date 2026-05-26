'use client';

import { useState, FormEvent } from 'react';
import { useStore } from '@/store/useStore';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const { login, register, isAuthLoading, authError, clearAuthError } = useStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();

    if (!username.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (!isLogin) {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      await register(username.trim(), password);
    } else {
      await login(username.trim(), password);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError('');
    clearAuthError();
    setPassword('');
    setConfirmPassword('');
  };

  const errorMessage = localError || authError;

  return (
    <div className={styles.wrapper}>
      {/* Background decorative elements */}
      <div className={styles.bgBlur1} />
      <div className={styles.bgBlur2} />

      <div className={styles.card}>
        {/* Brand Header */}
        <div className={styles.brand}>
          <div className={styles.logoIcon}>Q</div>
          <h1 className={styles.logoText}>Questra</h1>
        </div>
        <p className={styles.subtitle}>
          {isLogin
            ? 'Sign in to your account'
            : 'Create a new account'}
        </p>

        {/* Error Display */}
        {errorMessage && (
          <div className={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
              <path d="M8 4.5v4" stroke="currentColor" strokeLinecap="round" />
              <circle cx="8" cy="11" r="0.75" fill="currentColor" />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {!isLogin && (
            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isAuthLoading}
          >
            {isAuthLoading ? (
              <span className={styles.spinner} />
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Toggle */}
        <p className={styles.toggle}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" onClick={toggleMode}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
