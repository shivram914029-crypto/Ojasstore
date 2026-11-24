import React, { useEffect, useState } from 'react';
import { X, MessageCircle, Plus, Minus, ShieldCheck, Phone } from 'lucide-react';
import { SafeImage } from './BrandMark';
import { customerFetch, formatIndianMobile10 } from '../utils/customerAuth';
import {
  buildSingleProductWhatsAppMessage,
  buildWhatsAppChatUrl,
  formatINR,
} from '../utils/whatsapp';
import type { CustomerAddress, CustomerUser, Product, SiteContent } from '../types';

interface WhatsAppOrderModalProps {
  product: Product | null;
  initialVariantId?: string;
  initialQuantity?: number;
  isOpen: boolean;
  onClose: () => void;
  content: SiteContent;
  customerUser: CustomerUser | null;
  onNavigateToLogin: () => void;
}

export const WhatsAppOrderModal: React.FC<WhatsAppOrderModalProps> = ({
  product,
  initialVariantId,
  initialQuantity = 1,
  isOpen,
  onClose,
  content,
  customerUser,
  onNavigateToLogin,
}) => {
  const [variantId, setVariantId] = useState(initialVariantId || '');
  const [quantity, setQuantity] = useState(initialQuantity);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recordedOrderNumber, setRecordedOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setVariantId(initialVariantId || product.variants[0]?.id || '');
      setQuantity(Math.max(1, initialQuantity));
      setErrorMsg('');
      setRecordedOrderNumber(null);

      if (customerUser) {
        if (!customerName) setCustomerName(customerUser.name || '');
        if (!mobileNumber) setMobileNumber(formatIndianMobile10(customerUser.mobileNumber));
        customerFetch('/api/customer/addresses')
          .then((r) => (r.ok ? r.json() : { addresses: [] }))
          .then((data) => {
            const list = (data.addresses || []) as CustomerAddress[];
            if (list.length > 0) {
              const def = list.find((a) => a.isDefault) || list[0];
              setCustomerName(def.recipientName || customerUser.name || '');
              setMobileNumber(formatIndianMobile10(def.mobileNumber || customerUser.mobileNumber));
              setDeliveryAddress(def.deliveryAddress);
              setCity(def.city);
              setPincode(def.pincode);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, product?.id, initialVariantId, initialQuantity, customerUser?.id]);

  if (!isOpen || !product) return null;

  const activeVariant =
    product.variants.find((v) => v.id === variantId) || product.variants[0];
  const inStock = activeVariant && activeVariant.stock > 0;
  const maxQty = activeVariant ? Math.max(1, activeVariant.stock) : 1;

  const subtotal = (activeVariant?.price || 0) * quantity;
  const shippingFee =
    subtotal >= content.freeShippingThreshold ? 0 : content.standardShippingFee;
  const totalAmount = subtotal + shippingFee;

  const messageText = buildSingleProductWhatsAppMessage({
    productName: product.name,
    variantLabel: activeVariant?.label || '',
    quantity,
    unitPrice: activeVariant?.price || 0,
    content,
    orderNumber: recordedOrderNumber || undefined,
    customer: {
      customerName,
      mobileNumber,
      deliveryAddress,
      city,
      pincode,
      notes,
    },
  });

  const whatsappUrl = buildWhatsAppChatUrl(content.whatsappNumber, messageText);

  const handleSaveAndOpenWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVariant) return;
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await customerFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          mobileNumber,
          deliveryAddress,
          city,
          pincode,
          notes: notes ? `[WhatsApp Order] ${notes}` : '[WhatsApp Order Request]',
          paymentMethod: 'Cash on Delivery (Pay on Delivery)',
          items: [
            {
              productId: product.id,
              variantId: activeVariant.id,
              quantity,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not prepare WhatsApp order request.');
      }

      const orderNum = data.order?.orderNumber as string;
      setRecordedOrderNumber(orderNum);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Please check your customer details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1F17]/65 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${product.name} on WhatsApp`}
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#FAF8F3] text-[#1C241F] rounded-2xl border border-[#E5DEC9] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#163024] text-[#FAF8F3]">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-[#D4AF63]" />
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold">
                Order on WhatsApp
              </h2>
              <p className="text-xs text-[#D6DDD8] tabular-nums">
                Ojas Customer Care: {content.contactPhone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close WhatsApp order modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {recordedOrderNumber ? (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-white border border-[#1B4332] space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B88A3B]">
                  Status: Pending Customer Care Confirmation
                </p>
                <h3 className="font-serif text-2xl font-semibold text-[#163024]">
                  Order Request {recordedOrderNumber} Ready
                </h3>
                <p className="text-sm text-[#525E56] leading-relaxed">
                  Your order request is saved, but <strong>not confirmed yet</strong>. Tap the button below to open WhatsApp and send your order details directly to Ojas Customer Care ({content.contactPhone}) for confirmation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] space-y-2">
                <p className="text-xs font-semibold text-[#163024]">
                  Generated WhatsApp Message
                </p>
                <pre className="text-[11px] leading-relaxed text-[#1C241F] whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
                  {messageText}
                </pre>
              </div>

              <div className="space-y-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4AF63]" />
                  <span>Open WhatsApp &amp; Send Order</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] text-xs font-semibold text-[#163024]"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Selected Product Summary */}
              <div className="flex gap-4 p-4 rounded-xl bg-white border border-[#E5DEC9]">
                <SafeImage
                  src={product.images[0]}
                  alt={product.name}
                  className="w-20 h-20 rounded-lg object-cover shrink-0 border border-[#E5DEC9]"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#163024] leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#525E56] mt-0.5">
                      {activeVariant?.label} ·{' '}
                      <span className="font-semibold text-[#163024] tabular-nums">
                        {formatINR(activeVariant?.price || 0)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVariantId(v.id);
                            setQuantity(1);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            activeVariant?.id === v.id
                              ? 'bg-[#163024] text-[#FAF8F3]'
                              : 'bg-[#F2EFE6] text-[#1C241F] hover:bg-[#E5DEC9]'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    <div className="inline-flex items-center border border-[#E5DEC9] rounded-lg bg-[#FAF8F3]">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6] rounded-l-lg"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        disabled={!inStock || quantity >= maxQty}
                        className="w-8 h-8 flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6] rounded-r-lg disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800">
                  {errorMsg}
                </div>
              )}

          {!customerUser && (
            <div className="p-3 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#163024]">
                <Phone className="w-4 h-4 text-[#B88A3B] shrink-0" />
                <span>Login with your name &amp; mobile number to save &amp; track this WhatsApp order.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToLogin();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-xs font-semibold shrink-0"
              >
                Continue
              </button>
            </div>
          )}

          <form onSubmit={handleSaveAndOpenWhatsApp} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                Delivery Address *
              </label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House / Flat No., Street, Landmark"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit PIN"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gift packaging or delivery note"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            {/* Live Message Preview */}
            <div className="p-3.5 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#525E56]">
                <span className="font-semibold text-[#163024]">WhatsApp Message Preview</span>
                <span className="tabular-nums font-semibold text-[#163024]">
                  Est. Total: {formatINR(totalAmount)}
                </span>
              </div>
              <pre className="text-[11px] leading-relaxed text-[#1C241F] whitespace-pre-wrap font-sans max-h-28 overflow-y-auto">
                {messageText}
              </pre>
            </div>

            <div className="p-3 rounded-lg bg-white border border-[#E5DEC9] flex items-start gap-2.5 text-xs text-[#525E56]">
              <ShieldCheck className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
              <span>
                Your order is <strong>not confirmed</strong> until Ojas Customer Care ({content.contactPhone}) confirms availability and dispatch with you on WhatsApp.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="submit"
                disabled={submitting || !inStock}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4 text-[#D4AF63]" />
                <span>
                  {submitting
                    ? 'Preparing Order...'
                    : 'Send Order on WhatsApp'}
                </span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] text-xs font-semibold text-[#163024] whitespace-nowrap"
              >
                <span>Quick Chat Only</span>
              </a>
            </div>
          </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
