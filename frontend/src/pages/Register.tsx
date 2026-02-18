import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ChispaLogo } from '../components/ChispaLogo';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, fullName);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-fuega-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <ChispaLogo size={36} />
          <h1 className="mt-3 text-lg font-bold tracking-tight">
            <span className="gradient-text">Fuega</span>{' '}
            <span className="text-fuega-text-secondary font-normal">AI</span>
          </h1>
          <p className="text-[12px] text-fuega-text-muted mt-1">Create your operator account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-fuega-card border border-fuega-border rounded-lg p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[12px] text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-[11px] font-medium text-fuega-text-muted uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus
              autoComplete="name"
              className="w-full bg-fuega-input border border-fuega-border rounded-lg px-3 py-2 text-sm text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none focus:border-fuega-orange/50 transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-[11px] font-medium text-fuega-text-muted uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-fuega-input border border-fuega-border rounded-lg px-3 py-2 text-sm text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none focus:border-fuega-orange/50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] font-medium text-fuega-text-muted uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-fuega-input border border-fuega-border rounded-lg px-3 py-2 text-sm text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none focus:border-fuega-orange/50 transition-colors"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-[11px] font-medium text-fuega-text-muted uppercase tracking-wider mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-fuega-input border border-fuega-border rounded-lg px-3 py-2 text-sm text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none focus:border-fuega-orange/50 transition-colors"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-fuega-orange text-white rounded-lg py-2 text-sm font-medium hover:bg-fuega-orange/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-[12px] text-fuega-text-muted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-fuega-orange hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
