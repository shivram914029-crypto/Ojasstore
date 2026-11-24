import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Phone,
  MapPin,
} from 'lucide-react';
import { SafeImage } from './BrandMark';
import { UpiPayment } from './UpiPayment';
import { customerFetch, formatIndianMobile10 } from '../utils/customerAuth';
import {
  buildCartWhatsAppMessage,
  buildWhatsAppChatUrl,
  formatINR,
} from '../utils/whatsapp';
import type {
  CartItem,
  CustomerAddress,
  CustomerUser,
  Order,
  SiteContent,
} from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: number, variantId: string, quantity: number) => void;
  onRemoveItem: (productId: number, variantId: string) => void;
  onClearCart: () => void;
  onOrderCreated: () => void;
  content: SiteContent;
  customerUser: CustomerUser | null;
  onNavigateToLogin: () => void;
  onNavigateToAccount: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
  content,
  customerUser,
  onNavigateToLogin,
  onNavigateToAccount,
}) => {
  const [step, setStep] = useState<'bag' | 'checkout' | 'submitted'>('bag');
  const [checkoutMode, setCheckoutMode] = useState<'standard' | 'whatsapp'>('standard');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'custom'>('custom');
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI Payment (9140297457@ptyes)');
  const [checkoutUpiApp, setCheckoutUpiApp] = useState('Paytm');
  const [checkoutUtr, setCheckoutUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!customerUser) {
      setSavedAddresses([]);
      setSelectedAddressId('custom');
      return;
    }

    if (!customerName) setCustomerName(customerUser.name || '');
    if (!mobileNumber) setMobileNumber(formatIndianMobile10(customerUser.mobileNumber));

    customerFetch('/api/customer/addresses')
      .then((r) => (r.ok ? r.json() : { addresses: [] }))
      .then((data) => {
        const list = (data.addresses || []) as CustomerAddress[];
        setSavedAddresses(list);
        if (list.length > 0) {
          const def = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(def.id);
          setCustomerName(def.recipientName || customerUser.name || '');
          setMobileNumber(formatIndianMobile10(def.mobileNumber || customerUser.mobileNumber));
          setDeliveryAddress(def.deliveryAddress);
          setCity(def.city);
          setPincode(def.pincode);
        }
      })
      .catch(() => {
        // Ignore address prefetch errors
      });
  }, [isOpen, customerUser?.id, customerUser?.mobileNumber]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee =
    items.length === 0
      ? 0
      : subtotal >= content.freeShippingThreshold
      ? 0
      : content.standardShippingFee;
  const totalAmount = subtotal + shippingFee;

  const handleClose = () => {
    if (step === 'submitted') {
      setStep('bag');
      setSubmittedOrder(null);
      setCheckoutUtr('');
    }
    setErrorMsg('');
    onClose();
  };

  const liveWhatsAppMessage = buildCartWhatsAppMessage({
    items,
    content,
    order: submittedOrder || undefined,
    customer: {
      customerName,
      mobileNumber,
      deliveryAddress,
      city,
      pincode,
      notes,
    },
  });

  const liveWhatsAppUrl = buildWhatsAppChatUrl(content.whatsappNumber, liveWhatsAppMessage);

  const handleSelectSavedAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setCustomerName(addr.recipientName || customerUser?.name || '');
    setMobileNumber(formatIndianMobile10(addr.mobileNumber || customerUser?.mobileNumber));
    setDeliveryAddress(addr.deliveryAddress);
    setCity(addr.city);
    setPincode(addr.pincode);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
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
          notes,
          paymentMethod,
          upiTransactionId:
            paymentMethod.toLowerCase().includes('upi') && checkoutUtr.trim()
              ? checkoutUtr.trim()
              : undefined,
          upiPayerApp: paymentMethod.toLowerCase().includes('upi') ? checkoutUpiApp : undefined,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit order request.');
      }

      if (customerUser && saveAddressToAccount && selectedAddressId === 'custom') {
        await customerFetch('/api/customer/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: savedAddresses.length === 0 ? 'Home' : 'Checkout Address',
            recipientName: customerName,
            mobileNumber,
            deliveryAddress,
            city,
            pincode,
            isDefault: savedAddresses.length === 0,
          }),
        }).catch(() => {});
      }

      const createdOrder = data.order as Order;
      setSubmittedOrder(createdOrder);
      onClearCart();
      onOrderCreated();
      setStep('submitted');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit order request. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0E1F17]/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div className="fixed inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-lg bg-[#FAF8F3] text-[#1C241F] h-full flex flex-col border-l border-[#E5DEC9] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5DEC9] bg-white">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#163024]">
              {step === 'bag' && 'Your Shopping Bag'}
              {step === 'checkout' &&
                (checkoutMode === 'whatsapp'
                  ? 'WhatsApp Order Details'
                  : 'Delivery Details')}
              {step === 'submitted' && 'Order Request Received'}
            </h2>
            {step === 'bag' && items.length > 0 && (
              <p className="text-xs text-[#525E56] mt-0.5 tabular-nums">
                {subtotal >= content.freeShippingThreshold
                  ? 'You qualify for complimentary India shipping'
                  : `Add ${formatINR(content.freeShippingThreshold - subtotal)} more for complimentary shipping`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-lg border border-[#E5DEC9] flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6] transition-colors"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'submitted' && submittedOrder ? (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                <div className="flex items-center gap-2.5 text-[#B88A3B]">
                  <CheckCircle2 className="w-6 h-6 text-[#B88A3B] shrink-0" />
                  <span className="text-xs font-semibold tracking-wide uppercase">
                    Status: {submittedOrder.status}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#163024]">
                  Thank you, {submittedOrder.customerName}
                </h3>
                <p className="text-sm text-[#525E56] leading-relaxed">
                  Your order request{' '}
                  <strong className="text-[#163024] tabular-nums">
                    {submittedOrder.orderNumber}
                  </strong>{' '}
                  is currently marked as <strong>{submittedOrder.status}</strong>. Your order is
                  confirmed once Ojas Customer Care ({content.contactPhone}) verifies stock/payment
                  and confirms with you on WhatsApp or phone (
                  <span className="tabular-nums font-medium text-[#163024]">
                    {submittedOrder.mobileNumber}
                  </span>
                  ) before dispatch.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#525E56]">Order Request ID</span>
                  <span className="font-semibold text-[#163024] tabular-nums">
                    {submittedOrder.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525E56]">Payment Preference</span>
                  <span className="font-medium text-[#163024] text-right">
                    {submittedOrder.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525E56]">Payment Status</span>
                  <span className="font-semibold text-[#163024] text-right">
                    {submittedOrder.paymentStatus}
                    {submittedOrder.upiTransactionId
                      ? ` (UTR: ${submittedOrder.upiTransactionId})`
                      : ''}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E5DEC9] space-y-2">
                  {submittedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between gap-4">
                      <span className="text-[#1C241F]">
                        {item.productName} ({item.variantLabel}) × {item.quantity}
                      </span>
                      <span className="font-medium tabular-nums shrink-0">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#E5DEC9] flex justify-between font-semibold text-base text-[#163024]">
                  <span>Total Payable</span>
                  <span className="tabular-nums">{formatINR(submittedOrder.totalAmount)}</span>
                </div>
                <div className="pt-2 border-t border-[#E5DEC9] text-xs text-[#525E56]">
                  Delivering to: {submittedOrder.deliveryAddress}, {submittedOrder.city} –{' '}
                  {submittedOrder.pincode}
                </div>
              </div>

              {submittedOrder.paymentMethod.toLowerCase().includes('upi') && (
                <UpiPayment
                  amount={submittedOrder.totalAmount}
                  orderNumber={submittedOrder.orderNumber}
                  paymentStatus={submittedOrder.paymentStatus}
                  upiTransactionId={submittedOrder.upiTransactionId}
                  upiPayerApp={submittedOrder.upiPayerApp}
                  verificationMobile={submittedOrder.mobileNumber}
                  contactPhone={content.contactPhone}
                  compact
                  onOrderUpdated={(updatedOrder) => {
                    setSubmittedOrder(updatedOrder);
                    onOrderCreated();
                  }}
                />
              )}

              <div className="space-y-3">
                <a
                  href={liveWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4AF63]" />
                  <span>Send Order on WhatsApp ({content.contactPhone})</span>
                </a>
                {customerUser && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onNavigateToAccount();
                    }}
                    className="w-full py-3 rounded-lg border border-[#1B4332] bg-[#F2EFE6] hover:bg-[#E5DEC9] text-sm font-semibold text-[#163024] transition-colors"
                  >
                    Track Order in My Account
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] text-sm font-medium text-[#163024] transition-colors"
                >
                  Continue Browsing OJAS
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#F2EFE6] border border-[#E5DEC9] flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-[#1B4332]" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h3 className="font-serif text-2xl font-medium text-[#163024]">Your bag is empty</h3>
                <p className="text-sm text-[#525E56]">
                  Explore our natural Egg Shell Powder and hand-poured Designer Candles crafted with care.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-sm font-medium hover:bg-[#1B4332] transition-colors"
              >
                Explore Products
              </button>
            </div>
          ) : step === 'bag' ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex gap-4 p-4 rounded-xl bg-white border border-[#E5DEC9]"
                >
                  <SafeImage
                    src={item.image}
                    alt={item.productName}
                    className="w-20 h-20 rounded-lg object-cover shrink-0 border border-[#E5DEC9]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-[#163024] leading-snug">
                          {item.productName}
                        </h3>
                        <p className="text-xs text-[#525E56] mt-0.5">{item.variantLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId, item.variantId)}
                        className="p-1.5 text-[#525E56] hover:text-red-700 transition-colors"
                        aria-label={`Remove ${item.productName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#E5DEC9] rounded-lg bg-[#FAF8F3]">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, item.variantId, item.quantity - 1)
                          }
                          className="w-8 h-8 flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6] rounded-l-lg"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.productId,
                              item.variantId,
                              Math.min(item.stock, item.quantity + 1)
                            )
                          }
                          disabled={item.quantity >= item.stock}
                          className="w-8 h-8 flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6] rounded-r-lg disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-[#163024] tabular-nums">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form id="ojas-checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
              {!customerUser ? (
                <div className="p-3.5 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-[#163024]">
                    <Phone className="w-4 h-4 text-[#B88A3B] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Quick Customer Login</p>
                      <p className="text-[#525E56]">
                        Enter your name &amp; mobile number to auto-fill details &amp; track this
                        order, or continue as guest.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onNavigateToLogin();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-xs font-semibold shrink-0"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#F2EFE6] border border-[#1B4332]/25 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#163024]">
                    <span className="font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1B4332]" />
                      <span className="truncate max-w-[200px] tabular-nums">
                        {customerUser.name} · {customerUser.mobileNumber}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId('custom');
                        setDeliveryAddress('');
                        setCity('');
                        setPincode('');
                      }}
                      className="font-semibold text-[#1B4332] hover:text-[#B88A3B]"
                    >
                      + Use New Address
                    </button>
                  </div>

                  {savedAddresses.length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                            selectedAddressId === addr.id
                              ? 'bg-white border-[#163024] text-[#163024]'
                              : 'bg-white/70 border-[#E5DEC9] text-[#525E56] hover:bg-white'
                          }`}
                        >
                          <div className="font-semibold text-[#163024]">
                            {addr.label} · {addr.recipientName}
                          </div>
                          <div className="truncate">
                            {addr.deliveryAddress}, {addr.city} – {addr.pincode}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Mobile Number (WhatsApp / Call) *
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Delivery Address *
                </label>
                <textarea
                  required
                  rows={3}
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (selectedAddressId !== 'custom') setSelectedAddressId('custom');
                  }}
                  placeholder="House / Flat No., Building, Street, Landmark"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                    City / State *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (selectedAddressId !== 'custom') setSelectedAddressId('custom');
                    }}
                    placeholder="New Delhi"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, ''));
                      if (selectedAddressId !== 'custom') setSelectedAddressId('custom');
                    }}
                    placeholder="110030"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              {customerUser && selectedAddressId === 'custom' && (
                <label className="inline-flex items-center gap-2 text-xs text-[#163024] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAddressToAccount}
                    onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                    className="accent-[#163024]"
                  />
                  <span>Save this delivery address to my OJAS account</span>
                </label>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Payment Method
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: 'UPI Payment (9140297457@ptyes)',
                      label: 'UPI Payment — Scan QR / Paytm, PhonePe, Google Pay, BHIM',
                    },
                    {
                      value: 'Cash on Delivery (Pay on Delivery)',
                      label: 'Cash on Delivery (Pay on Delivery)',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                        paymentMethod === option.value
                          ? 'bg-white border-[#1B4332] text-[#163024] font-medium'
                          : 'bg-[#F2EFE6]/60 border-[#E5DEC9] text-[#525E56]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={paymentMethod === option.value}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="accent-[#1B4332]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                {paymentMethod.toLowerCase().includes('upi') && (
                  <div className="mt-3 space-y-3">
                    <UpiPayment
                      amount={totalAmount}
                      contactPhone={content.contactPhone}
                      compact
                    />

                    <div className="p-3.5 rounded-xl bg-white border border-[#E5DEC9] space-y-2.5">
                      <p className="text-xs font-semibold text-[#163024]">
                        Already paid by scanning above? Enter UTR / Transaction ID (Optional)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={checkoutUpiApp}
                          onChange={(e) => setCheckoutUpiApp(e.target.value)}
                          className="px-2.5 py-2 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs text-[#163024]"
                        >
                          <option value="Paytm">Paytm</option>
                          <option value="PhonePe">PhonePe</option>
                          <option value="Google Pay">Google Pay</option>
                          <option value="BHIM">BHIM</option>
                          <option value="Other UPI App">Other UPI</option>
                        </select>
                        <input
                          type="text"
                          value={checkoutUtr}
                          onChange={(e) => setCheckoutUtr(e.target.value)}
                          placeholder="12-digit UTR / Ref ID (or enter after submit)"
                          className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono focus:outline-none focus:border-[#1B4332]"
                        />
                      </div>
                      <p className="text-[11px] text-[#525E56]">
                        You can also submit your order first and verify payment on the next screen.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Delivery Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gift wrap note or delivery timing preference"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-[#F2EFE6] border border-[#E5DEC9] space-y-2">
                <p className="text-xs font-semibold text-[#163024]">
                  WhatsApp Message Preview ({content.contactPhone})
                </p>
                <pre className="text-[11px] leading-relaxed text-[#1C241F] whitespace-pre-wrap font-sans max-h-28 overflow-y-auto">
                  {liveWhatsAppMessage}
                </pre>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-[#E5DEC9] flex items-start gap-2.5 text-xs text-[#525E56]">
                <ShieldCheck className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                <span>
                  Your order is <strong>not confirmed</strong> until Ojas Customer Care ({content.contactPhone}) reviews stock and confirms it with you.
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && step !== 'submitted' && (
          <div className="border-t border-[#E5DEC9] bg-white px-6 py-5 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#525E56]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#1C241F]">
                  {formatINR(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#525E56]">
                <span>Shipping</span>
                <span className="tabular-nums font-medium text-[#1C241F]">
                  {shippingFee === 0 ? 'Complimentary' : formatINR(shippingFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E5DEC9] flex justify-between text-base font-semibold text-[#163024]">
                <span>Total</span>
                <span className="tabular-nums">{formatINR(totalAmount)}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutMode('standard');
                    setStep('checkout');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold"
                >
                  <span>Proceed to Order</span>
                  <ArrowRight className="w-4 h-4 text-[#D4AF63]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutMode('whatsapp');
                    setStep('checkout');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#F2EFE6] border border-[#1B4332]/30 text-[#163024] hover:bg-[#E5DEC9] transition-colors text-xs sm:text-sm font-semibold"
                >
                  <MessageCircle className="w-4 h-4 text-[#1B4332]" />
                  <span>Order on WhatsApp (Add Details &amp; Send)</span>
                </button>
                <a
                  href={liveWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[#525E56] hover:text-[#163024] transition-colors"
                >
                  <span>Or open WhatsApp chat directly</span>
                </a>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-4 py-3 rounded-lg border border-[#E5DEC9] text-sm font-medium text-[#163024] hover:bg-[#F2EFE6] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="ojas-checkout-form"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold disabled:opacity-60"
                >
                  {checkoutMode === 'whatsapp' && (
                    <MessageCircle className="w-4 h-4 text-[#D4AF63]" />
                  )}
                  <span>
                    {submitting
                      ? 'Submitting Request...'
                      : checkoutMode === 'whatsapp'
                      ? `Send Order on WhatsApp (${formatINR(totalAmount)})`
                      : `Submit Order Request (${formatINR(totalAmount)})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
