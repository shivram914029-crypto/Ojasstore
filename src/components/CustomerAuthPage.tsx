import React, { useState } from 'react';
import {
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import {
  customerFetch,
  formatIndianMobile10,
  isValidIndianMobile10,
  setCustomerSessionToken,
} from '../utils/customerAuth';
import type { CustomerUser } from '../types';

interface CustomerAuthPageProps {
  customerUser: CustomerUser | null;
  onNavigate: (path: string) => void;
  onAuthenticated: (customer: CustomerUser) => void;
}

export const CustomerAuthPage: React.FC<CustomerAuthPageProps> = ({
  customerUser,
  onNavigate,
  onAuthenticated,
}) => {
  const [name, setName] = useState('');
  const [mobile10, setMobile10] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (customerUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="p-8 rounded-2xl bg-white border border-[#E5DEC9] text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#F2EFE6] border border-[#E5DEC9] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-[#1B4332]" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-serif text-3xl font-semibold text-[#163024]">
              Namaste, {customerUser.name}
            </h1>
            <p className="text-sm text-[#525E56] tabular-nums">
              You are signed in with mobile number{' '}
              <strong className="text-[#163024]">{customerUser.mobileNumber}</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/account')}
              className="flex-1 py-3 px-4 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-sm font-semibold"
            >
              My Orders &amp; Profile
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/products')}
              className="flex-1 py-3 px-4 rounded-lg border border-[#E5DEC9] bg-[#FAF8F3] hover:bg-[#F2EFE6] text-sm font-semibold text-[#163024]"
            >
              Shop Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const digits10 = formatIndianMobile10(mobile10);
    if (!isValidIndianMobile10(digits10)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await customerFetch('/api/customer/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          mobileNumber: digits10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to continue right now.');
      }

      if (data.sessionToken) {
        setCustomerSessionToken(data.sessionToken);
      }
      onAuthenticated(data.customer as CustomerUser);
      onNavigate('/');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to continue. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden border border-[#E5DEC9] bg-white">
        {/* Left Botanical Brand Column */}
        <div className="lg:col-span-5 bg-[#163024] text-[#FAF8F3] p-8 sm:p-10 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <BrandMark size="md" tone="light" />
              <div>
                <p className="font-serif text-2xl tracking-[0.14em] font-semibold">OJAS</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#D4AF63]">
                  Pure by Nature
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-balance">
                Login / Continue to OJAS
              </h1>
              <p className="text-sm text-[#D6DDD8] leading-relaxed">
                Enter just your full name and mobile number to enter the website instantly, track
                your own orders, and enjoy faster checkout.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-[#264A38] space-y-2.5 text-xs text-[#D6DDD8]">
            <p className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF63] shrink-0" />
              <span>Instant entry — no Gmail, no Password, and no OTP required</span>
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D4AF63] shrink-0" />
              <span>Your name &amp; mobile number are saved for future visits</span>
            </p>
          </div>
        </div>

        {/* Right Identity Entry Form Column */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B88A3B]">
              Quick Customer Access
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#163024] mt-1">
              Welcome to OJAS Natural Living
            </h2>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#525E56] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                Mobile Number *
              </label>
              <div className="flex">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-l-lg bg-[#F2EFE6] border border-r-0 border-[#E5DEC9] text-sm font-semibold text-[#163024] tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-[#B88A3B]" />
                  <span>+91</span>
                </span>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile10}
                  onChange={(e) => setMobile10(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-3 rounded-r-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold disabled:opacity-60 min-h-[48px]"
            >
              <span>{submitting ? 'Entering OJAS...' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF63]" />
            </button>
          </form>

          <div className="pt-2 border-t border-[#E5DEC9] flex items-center justify-between gap-3 text-xs text-[#525E56]">
            <span>Prefer to look around first?</span>
            <button
              type="button"
              onClick={() => onNavigate('/products')}
              className="font-semibold text-[#163024] hover:text-[#B88A3B] underline underline-offset-4"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CustomerEntryModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onAuthenticated: (customer: CustomerUser) => void;
}

export const CustomerEntryModal: React.FC<CustomerEntryModalProps> = ({
  isOpen,
  onDismiss,
  onAuthenticated,
}) => {
  const [name, setName] = useState('');
  const [mobile10, setMobile10] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const digits10 = formatIndianMobile10(mobile10);
    if (!isValidIndianMobile10(digits10)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await customerFetch('/api/customer/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          mobileNumber: digits10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to continue.');
      }
      if (data.sessionToken) {
        setCustomerSessionToken(data.sessionToken);
      }
      onAuthenticated(data.customer as CustomerUser);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to continue. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#163024]/55 backdrop-blur-xs"
        onClick={onDismiss}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ojas-customer-entry-title"
        className="relative w-full max-w-md rounded-2xl bg-[#FAF8F3] border border-[#E5DEC9] shadow-2xl overflow-hidden"
      >
        <div className="bg-[#163024] text-[#FAF8F3] px-6 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" tone="light" />
            <div>
              <p className="font-serif text-xl tracking-[0.14em] font-semibold">OJAS</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#D4AF63]">
                Pure by Nature
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Browse website without signing in"
            className="p-2 rounded-lg text-[#D6DDD8] hover:text-white hover:bg-[#1B4332] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <h2
              id="ojas-customer-entry-title"
              className="font-serif text-2xl font-semibold text-[#163024]"
            >
              Login / Continue to OJAS
            </h2>
            <p className="text-xs sm:text-sm text-[#525E56]">
              Enter your full name and mobile number to continue—no password or OTP required.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#525E56] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                Mobile Number *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2.5 rounded-l-lg bg-[#F2EFE6] border border-r-0 border-[#E5DEC9] text-sm font-semibold text-[#163024] tabular-nums">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile10}
                  onChange={(e) => setMobile10(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 rounded-r-lg bg-white border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold disabled:opacity-60 min-h-[46px]"
            >
              <span>{submitting ? 'Entering...' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF63]" />
            </button>
          </form>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full text-center text-xs font-semibold text-[#525E56] hover:text-[#163024] py-1"
          >
            Continue browsing as guest
          </button>
        </div>
      </div>
    </div>
  );
};
