import React, { useState } from 'react';
import { 
  ShieldCheck, Factory, Store, Lock, Mail, Eye, EyeOff, 
  ArrowRight, AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsSubmitting(true);
    try {
      await login(demoEmail, demoPass);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Quick login failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-factory-dark text-factory-cream flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-factory-secondary selection:text-factory-dark">
      {/* Background Ambience / Industrial Gradient Glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-factory-secondary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-factory-primary/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md sm:max-w-xl z-10 space-y-6">
        {/* Header / Brand */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center mb-1 group">
            {/* Ambient industrial glow */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-factory-secondary/40 via-amber-500/20 to-factory-primary/40 blur-xl opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse pointer-events-none" />
            
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-factory-canvas/90 border-2 border-factory-secondary/70 shadow-2xl shadow-factory-secondary/25 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
              <img
                src="/logo.png"
                alt="Ali Bori Shoe Lace Factory Logo"
                className="w-full h-full object-contain rounded-full shadow-inner"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-wider text-factory-cream">
              ALI BORI SHOE LACE
            </h1>
            <p className="text-xs sm:text-sm text-factory-muted max-w-sm mx-auto mt-1">
              Manufacturing & Distribution ERP System
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-factory-darkCard border border-factory-darkBorder rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="border-b border-factory-darkBorder/60 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-factory-cream font-heading">
                Sign In to Factory Portal
              </h2>
              <p className="text-xs text-factory-muted mt-0.5">
                Enter your credentials or choose a demo role below
              </p>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-factory-secondary/15 text-factory-secondary border border-factory-secondary/30 rounded">
              v2.4 Live
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-factory-muted mb-1.5 uppercase tracking-wider font-mono">
                Email Address / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-factory-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@alibori.com"
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-factory-cream placeholder-factory-muted/50 focus:outline-none focus:border-factory-secondary focus:ring-1 focus:ring-factory-secondary transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-factory-muted mb-1.5 uppercase tracking-wider font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-factory-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-xl pl-10 pr-11 py-2.5 text-sm text-factory-cream placeholder-factory-muted/50 focus:outline-none focus:border-factory-secondary focus:ring-1 focus:ring-factory-secondary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-factory-muted hover:text-factory-cream transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-factory-secondary hover:bg-factory-secondary/90 text-factory-dark font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-factory-secondary/20 hover:shadow-lg hover:shadow-factory-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Roles */}
          <div className="mt-8 pt-6 border-t border-factory-darkBorder">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-factory-secondary mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Test Logins (Click any role)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Role 1: Super Admin */}
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@alibori.com', 'admin123')}
                disabled={isSubmitting}
                className="p-3 rounded-xl bg-factory-dark/80 border border-factory-darkBorder hover:border-factory-darkBorder/80 hover:bg-factory-darkCard text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-factory-paper font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-factory-amber group-hover:scale-110 transition-transform" />
                  <span>Super Admin</span>
                </div>
                <div className="text-[10px] text-factory-muted mt-1 line-clamp-2">
                  Full control: all modules, payroll, users & settings
                </div>
              </button>

              {/* Role 2: Factory Monitor */}
              <button
                type="button"
                onClick={() => handleQuickLogin('factory@alibori.com', 'factory123')}
                disabled={isSubmitting}
                className="p-3 rounded-xl bg-factory-dark/80 border border-factory-darkBorder hover:border-factory-darkBorder/80 hover:bg-factory-darkCard text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-factory-paper font-bold text-xs">
                  <Factory className="w-4 h-4 shrink-0 text-factory-paper group-hover:scale-110 transition-transform" />
                  <span>Factory Monitor</span>
                </div>
                <div className="text-[10px] text-factory-muted mt-1 line-clamp-2">
                  Production batches, dispatches, raw materials
                </div>
              </button>

              {/* Role 3: Store */}
              <button
                type="button"
                onClick={() => handleQuickLogin('store@alibori.com', 'store123')}
                disabled={isSubmitting}
                className="p-3 rounded-xl bg-factory-dark/80 border border-factory-darkBorder hover:border-factory-darkBorder/80 hover:bg-factory-darkCard text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-factory-paper font-bold text-xs">
                  <Store className="w-4 h-4 shrink-0 text-factory-paper group-hover:scale-110 transition-transform" />
                  <span>Store / Shop</span>
                </div>
                <div className="text-[10px] text-factory-muted mt-1 line-clamp-2">
                  Finished sacks, place orders & stock requests
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-factory-muted">
          Ali Bori Shoe Lace Factory &copy; 2026. Addis Ababa, Ethiopia.
        </div>
      </div>
    </div>
  );
};
