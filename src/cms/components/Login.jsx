import { useState } from 'react';
import Field from './Field.jsx';

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSignIn(email.trim(), password);
    } catch (err) {
      setError(err.message || "Couldn't sign in. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="cms-login">
      <form className="cms-card cms-login__card" onSubmit={submit} noValidate>
        <h1>Sign in</h1>
        <p className="cms-muted">Portfolio CMS. Only the site owner can sign in and edit.</p>
        <Field label="Email">
          {(p) => <input {...p} type="email" className="cms-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
        </Field>
        <Field label="Password">
          {(p) => <input {...p} type="password" className="cms-input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && <p className="cms-error" role="alert">{error}</p>}
        <button type="submit" className="cms-btn cms-btn--primary cms-login__submit" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
      </form>
    </main>
  );
}
