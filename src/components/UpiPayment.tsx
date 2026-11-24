import React, { useState } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  ZoomIn,
  X,
  CheckCircle2,
  Clock,
  Upload,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { customerFetch } from '../utils/customerAuth';
import { formatINR } from '../utils/whatsapp';
import type { Order, PaymentStatus } from '../types';

export const OJAS_UPI_CONFIG = {
  payeeName: 'Shivram',
  upiId: '9140297457@ptyes',
  qrImageUrl: '/assets/aistudio/receive_money_image_ee10d581.png',
} as const;

const UPI_APPS = [
  { id: 'Paytm', label: 'Paytm' },
  { id: 'PhonePe', label: 'PhonePe' },
  { id: 'Google Pay', label: 'Google Pay' },
  { id: 'BHIM', label: 'BHIM' },
] as const;

export interface UpiPaymentProps {
  payeeName?: string;
  upiId?: string;
  qrImageUrl?: string;
  amount?: number;
  orderNumber?: string;
  paymentStatus?: PaymentStatus;
  upiTransactionId?: string;
  upiPayerApp?: string;
  verificationMobile?: string;
  contactPhone?: string;
  compact?: boolean;
  onOrderUpdated?: (order: Order) => void;
  className?: string;
}

export const UpiPayment: React.FC<UpiPaymentProps> = ({
  payeeName = OJAS_UPI_CONFIG.payeeName,
  upiId = OJAS_UPI_CONFIG.upiId,
  qrImageUrl = OJAS_UPI_CONFIG.qrImageUrl,
  amount,
  orderNumber,
  paymentStatus = 'Unpaid',
  upiTransactionId = '',
  upiPayerApp = 'Paytm',
  verificationMobile = '',
  contactPhone = '+91 9140297457',
  compact = false,
  onOrderUpdated,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Payment Verification form state (active when orderNumber is present)
  const [selectedApp, setSelectedApp] = useState<string>(upiPayerApp || 'Paytm');
  const [utrInput, setUtrInput] = useState<string>(upiTransactionId || '');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');

  const handleCopyUpiId = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(upiId);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = upiId;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  // Standard NPCI UPI Intent URI pre-filled with exact payee, UPI ID, and exact order amount
  const buildUpiUri = (scheme = 'upi://pay') => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      cu: 'INR',
      tn: orderNumber ? `OJAS Order ${orderNumber}` : 'OJAS Natural Products',
    });
    if (typeof amount === 'number' && amount > 0) {
      params.set('am', amount.toFixed(2));
    }
    return `${scheme}?${params.toString()}`;
  };

  const universalUpiUri = buildUpiUri('upi://pay');

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orderNumber) return;
    setVerifyError('');
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await customerFetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/payment-proof`,
        {
          method: 'POST',
          headers: verificationMobile ? { 'x-order-mobile': verificationMobile } : undefined,
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not upload payment screenshot.');
      }
      setProofUrl(data.url);
    } catch (err: any) {
      setVerifyError(err?.message || 'Unable to upload payment screenshot.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber) return;
    setVerifyError('');
    setVerifySuccess('');

    const cleanUtr = utrInput.replace(/\s+/g, '').trim();
    if (!/^[A-Za-z0-9]{8,35}$/.test(cleanUtr)) {
      setVerifyError(
        'Please enter a valid 12-digit UPI Reference / UTR Number from your Paytm, PhonePe, GPay, or BHIM receipt.'
      );
      return;
    }

    setVerifying(true);
    try {
      const res = await customerFetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/verify-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upiTransactionId: cleanUtr,
            upiPayerApp: selectedApp,
            paymentProofUrl: proofUrl || undefined,
            mobileNumber: verificationMobile || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit payment verification.');
      }
      setVerifySuccess(
        `UTR ${data.order.upiTransactionId} submitted. Order status updated to "${data.order.status}".`
      );
      onOrderUpdated?.(data.order as Order);
    } catch (err: any) {
      setVerifyError(err?.message || 'Unable to verify payment right now.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section
      aria-label="OJAS UPI Payment"
      className={`rounded-2xl bg-[#FAF8F3] border border-[#1B4332]/25 overflow-hidden shadow-xs ${className}`}
    >
      {/* Header Band in OJAS Deep Botanical Green */}
      <div
        className={`bg-[#163024] text-[#FAF8F3] flex items-center justify-between gap-3 ${
          compact ? 'px-4 py-3.5' : 'px-6 py-5'
        }`}
      >
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF63]">
            Paytm · PhonePe · Google Pay · BHIM
          </p>
          <h3
            className={`font-serif font-semibold text-[#FAF8F3] leading-tight ${
              compact ? 'text-lg' : 'text-2xl'
            }`}
          >
            Scan &amp; Pay via UPI
          </h3>
        </div>

        <div className="text-right shrink-0">
          {typeof amount === 'number' && amount > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#D6DDD8]">
                Order Total
              </p>
              <p className="font-serif text-lg sm:text-xl font-semibold text-[#D4AF63] tabular-nums">
                {formatINR(amount)}
              </p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#264A38] border border-[#D4AF63]/30 text-[11px] font-medium text-[#FAF8F3]">
              <Smartphone className="w-3.5 h-3.5 text-[#D4AF63]" />
              <span>All UPI Apps</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${compact ? 'p-4 space-y-4' : 'p-6 sm:p-8 space-y-6'}`}>
        {orderNumber && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] text-xs">
            <div>
              <span className="text-[#525E56]">Order Reference: </span>
              <span className="font-semibold text-[#163024] tabular-nums">{orderNumber}</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                paymentStatus === 'Verified Paid'
                  ? 'bg-[#163024] text-[#D4AF63]'
                  : paymentStatus === 'Verification Pending'
                  ? 'bg-[#B88A3B]/20 text-[#163024] border border-[#B88A3B]/40'
                  : paymentStatus === 'Payment Rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-white text-[#525E56] border border-[#E5DEC9]'
              }`}
            >
              {paymentStatus}
            </span>
          </div>
        )}

        <div
          className={`grid gap-5 items-start ${
            compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-12'
          }`}
        >
          {/* Genuine Scannable Paytm UPI QR Image (Unmodified) */}
          <div className={compact ? 'flex flex-col items-center' : 'md:col-span-5 flex flex-col items-center'}>
            <div
              className={`w-full ${
                compact ? 'max-w-[270px]' : 'max-w-[300px]'
              } rounded-2xl bg-white border border-[#E5DEC9] p-2.5 shadow-xs space-y-2`}
            >
              <div className="w-full rounded-xl overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={qrImageUrl}
                  alt={`Paytm UPI QR Code for ${payeeName} (${upiId})`}
                  className="w-full h-auto max-h-[380px] object-contain block"
                />
              </div>
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#FAF8F3] hover:bg-[#F2EFE6] border border-[#E5DEC9] text-xs font-semibold text-[#163024] transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5 text-[#1B4332]" />
                <span>Tap to Enlarge QR for Scanning</span>
              </button>
            </div>
          </div>

          {/* Payee Info, UPI ID Copy, App Quick Launch, & Payment Verification */}
          <div className={compact ? 'space-y-3.5' : 'md:col-span-7 space-y-4'}>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E5DEC9]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#525E56]">
                    Payee Name
                  </p>
                  <p className="font-serif text-lg font-semibold text-[#163024]">
                    {payeeName}
                  </p>
                </div>
                {typeof amount === 'number' && amount > 0 && (
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#525E56]">
                      Pay Exact Amount
                    </p>
                    <p className="text-base font-bold text-[#1B4332] tabular-nums">
                      {formatINR(amount)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#525E56]">
                  UPI ID
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] flex items-center">
                    <span className="font-mono text-sm font-semibold text-[#163024] truncate select-all">
                      {upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpiId}
                    aria-label={copied ? 'UPI ID copied' : 'Copy UPI ID'}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 min-h-[42px] cursor-pointer ${
                      copied
                        ? 'bg-[#1B4332] text-[#FAF8F3] border border-[#1B4332]'
                        : 'bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332]'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#D4AF63]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#D4AF63]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Direct Mobile UPI App Pay Actions */}
              <div className="pt-2 border-t border-[#E5DEC9] space-y-2">
                <a
                  href={universalUpiUri}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#1B4332] text-[#FAF8F3] hover:bg-[#163024] transition-colors text-xs sm:text-sm font-semibold"
                >
                  <Smartphone className="w-4 h-4 text-[#D4AF63]" />
                  <span>
                    {typeof amount === 'number' && amount > 0
                      ? `Pay ${formatINR(amount)} via Installed UPI App`
                      : 'Open Installed UPI App'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {UPI_APPS.map((app) => {
                    const schemeMap: Record<string, string> = {
                      Paytm: 'paytmmp://pay',
                      PhonePe: 'phonepe://pay',
                      'Google Pay': 'tez://upi/pay',
                      BHIM: 'bhim://upi/pay',
                    };
                    return (
                      <a
                        key={app.id}
                        href={buildUpiUri(schemeMap[app.id] || 'upi://pay')}
                        onClick={() => setSelectedApp(app.id)}
                        className="py-1.5 px-2 rounded-lg bg-[#FAF8F3] hover:bg-[#F2EFE6] border border-[#E5DEC9] text-center text-[11px] font-semibold text-[#163024] transition-colors"
                      >
                        {app.label}
                      </a>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#525E56]">
                  On mobile, tap an app above or scan the QR code using Paytm, PhonePe, Google Pay,
                  or BHIM.
                </p>
              </div>
            </div>

            {/* Real Payment Verification Section (rendered when an Order exists) */}
            {orderNumber ? (
              paymentStatus === 'Verified Paid' ? (
                <div className="p-4 rounded-xl bg-[#163024] text-[#FAF8F3] border border-[#1B4332] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#D4AF63] font-semibold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payment Verified &amp; Received</span>
                  </div>
                  <p className="text-xs text-[#D6DDD8] leading-relaxed">
                    UTR / Ref ID:{' '}
                    <strong className="font-mono text-[#FAF8F3]">{upiTransactionId}</strong>
                    {upiPayerApp ? ` (${upiPayerApp})` : ''}. Your order is confirmed for studio
                    dispatch.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitVerification}
                  className="p-4 rounded-xl bg-white border border-[#1B4332]/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#B88A3B]">
                        Step 2 · Verify Your Payment
                      </p>
                      <h4 className="font-serif text-base sm:text-lg font-semibold text-[#163024]">
                        {paymentStatus === 'Verification Pending'
                          ? 'Payment Verification Submitted'
                          : 'Submit UPI Reference / UTR Number'}
                      </h4>
                    </div>
                    {paymentStatus === 'Verification Pending' && (
                      <Clock className="w-4 h-4 text-[#B88A3B] shrink-0 mt-1" />
                    )}
                  </div>

                  {paymentStatus === 'Verification Pending' && (
                    <div className="p-3 rounded-lg bg-[#F2EFE6] border border-[#E5DEC9] text-xs text-[#163024] space-y-1">
                      <p>
                        Submitted UTR:{' '}
                        <strong className="font-mono">{upiTransactionId}</strong> ({upiPayerApp})
                      </p>
                      <p className="text-[#525E56]">
                        Our team is verifying this transfer to Shivram ({upiId}). Once matched, your
                        order status automatically updates to <strong>Confirmed</strong>.
                      </p>
                    </div>
                  )}

                  {paymentStatus === 'Payment Rejected' && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        We could not match the previous UTR ({upiTransactionId}). Please double-check
                        your UPI receipt and re-submit below or reach out on WhatsApp ({contactPhone}
                        ).
                      </span>
                    </div>
                  )}

                  {verifyError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                      {verifyError}
                    </div>
                  )}
                  {verifySuccess && (
                    <div className="p-3 rounded-lg bg-[#F2EFE6] border border-[#1B4332]/30 text-xs text-[#163024] font-medium">
                      {verifySuccess}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                      UPI App Used
                    </label>
                    <select
                      value={selectedApp}
                      onChange={(e) => setSelectedApp(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs sm:text-sm text-[#163024]"
                    >
                      <option value="Paytm">Paytm</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="BHIM">BHIM</option>
                      <option value="Other UPI App">Other UPI App</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                      12-Digit UTR / UPI Transaction ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder="e.g. 412345678901"
                      className="w-full px-3 py-2 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs sm:text-sm font-mono focus:outline-none focus:border-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                      Payment Screenshot (Optional)
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5DEC9] bg-[#FAF8F3] hover:bg-[#F2EFE6] text-xs font-semibold text-[#163024] cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#1B4332]" />
                      <span>
                        {uploadingProof
                          ? 'Uploading...'
                          : proofUrl
                          ? 'Screenshot Attached ✓'
                          : 'Attach Receipt Screenshot'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleProofUpload}
                        disabled={uploadingProof}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={verifying || uploadingProof}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-xs sm:text-sm font-semibold disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF63]" />
                    <span>
                      {verifying
                        ? 'Submitting Verification...'
                        : paymentStatus === 'Verification Pending'
                        ? 'Update UTR / Verification Details'
                        : 'Verify Payment & Update Order'}
                    </span>
                  </button>
                </form>
              )
            ) : (
              <div className="p-3.5 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] flex items-start gap-2.5 text-xs text-[#525E56] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                <span>
                  Pay exact order amount to <strong className="text-[#163024]">{payeeName}</strong> (
                  <span className="font-mono text-[#163024]">{upiId}</span>) using Paytm, PhonePe,
                  Google Pay, or BHIM, then submit your 12-digit UTR / Reference ID for quick
                  order verification.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enlarged Unmodified QR Modal for Easy Camera Scanning */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0E1F17]/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged UPI QR Code"
        >
          <div className="fixed inset-0" onClick={() => setZoomOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#FAF8F3] border border-[#E5DEC9] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B88A3B]">
                  Scan with any UPI App
                </p>
                <h4 className="font-serif text-xl font-semibold text-[#163024]">
                  {payeeName} · <span className="font-mono text-sm">{upiId}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="w-9 h-9 rounded-lg border border-[#E5DEC9] bg-white flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6]"
                aria-label="Close zoomed QR"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-white p-3 border border-[#E5DEC9]">
              <img
                src={qrImageUrl}
                alt={`Paytm UPI QR Code for ${payeeName}`}
                className="w-full h-auto max-h-[70vh] object-contain mx-auto block"
              />
            </div>

            {typeof amount === 'number' && amount > 0 && (
              <div className="p-3 rounded-xl bg-[#163024] text-[#FAF8F3] flex items-center justify-between text-sm">
                <span>Total Amount to Pay</span>
                <strong className="font-serif text-lg text-[#D4AF63] tabular-nums">
                  {formatINR(amount)}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
