import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  XCircle,
  Truck,
  FileText,
  Clock,
  RotateCcw,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import type { Order, OrderStatus, RefundStatus, SiteContent } from '../../types';
import { buildWhatsAppChatUrl, formatINR } from '../../utils/whatsapp';

interface OrderDetailInvoiceModalProps {
  order: Order | null;
  content: SiteContent;
  initialMode?: 'manage' | 'invoice';
  onClose: () => void;
  onUpdateStatus: (
    orderId: number,
    status: OrderStatus,
    note?: string
  ) => Promise<void>;
  onUpdateCourier: (
    orderId: number,
    payload: {
      courierName: string;
      deliveryPartner: string;
      trackingNumber: string;
      courierCharges: number;
      status?: OrderStatus;
      note?: string;
    }
  ) => Promise<void>;
  onVerifyPayment: (
    orderId: number,
    action: 'verify' | 'reject' | 'collect_cod'
  ) => Promise<void>;
  onUpdateRefund: (
    orderId: number,
    payload: {
      refundStatus: RefundStatus;
      refundAmount: number;
      returnReason: string;
      markReturned?: boolean;
    }
  ) => Promise<void>;
}

const ALL_STATUSES: OrderStatus[] = [
  'Pending',
  'Pending Confirmation',
  'Payment Verification Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
];

const REFUND_STATUSES: RefundStatus[] = [
  'None',
  'Requested',
  'Approved',
  'Refunded',
  'Rejected',
];

export const OrderDetailInvoiceModal: React.FC<OrderDetailInvoiceModalProps> = ({
  order,
  content,
  initialMode = 'manage',
  onClose,
  onUpdateStatus,
  onUpdateCourier,
  onVerifyPayment,
  onUpdateRefund,
}) => {
  const [viewMode, setViewMode] = useState<'manage' | 'invoice'>(initialMode);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>('Confirmed');
  const [statusNote, setStatusNote] = useState('');
  const [courierName, setCourierName] = useState('');
  const [deliveryPartner, setDeliveryPartner] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierCharges, setCourierCharges] = useState<number>(0);
  const [refundStatus, setRefundStatus] = useState<RefundStatus>('None');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [returnReason, setReturnReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setViewMode(initialMode);
  }, [initialMode, order?.id]);

  useEffect(() => {
    if (!order) return;
    setStatusDraft(order.status);
    setStatusNote('');
    setCourierName(order.courierName || '');
    setDeliveryPartner(order.deliveryPartner || order.courierName || '');
    setTrackingNumber(order.trackingNumber || '');
    setCourierCharges(order.courierCharges || 0);
    setRefundStatus(order.refundStatus || 'None');
    setRefundAmount(order.refundAmount || order.totalAmount);
    setReturnReason(order.returnReason || '');
  }, [order]);

  if (!order) return null;

  const isCod = order.paymentMethod.toLowerCase().includes('cash');
  const taxableValue = Math.max(0, order.subtotal - order.gstAmount);
  const cgst = Math.round(order.gstAmount / 2);
  const sgst = order.gstAmount - cgst;

  const handleAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const whatsappCustomerMsg = `Namaste ${order.customerName}, update on your OJAS order ${order.orderNumber}: Current status is "${order.status}".${
    order.trackingNumber ? ` Tracking ID: ${order.trackingNumber} (${order.deliveryPartner || order.courierName || 'Courier'}).` : ''
  } Thank you for choosing OJAS.`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="no-print px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-xl font-semibold text-[#163024] tabular-nums">
                Order {order.orderNumber}
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#163024]/10 text-[#163024] text-xs font-semibold">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('manage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                viewMode === 'manage'
                  ? 'bg-[#163024] text-white border-[#163024]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Order Controls
            </button>
            <button
              type="button"
              onClick={() => setViewMode('invoice')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                viewMode === 'invoice'
                  ? 'bg-[#163024] text-white border-[#163024]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tax Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {viewMode === 'invoice' ? (
            <div className="space-y-4">
              <div className="no-print flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-600">
                  GST-inclusive Tax Invoice generated from live order database values.
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
              </div>

              <div className="ojas-print-invoice bg-white border border-slate-300 rounded-xl p-6 sm:p-8 text-slate-900 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <p className="font-serif text-2xl font-bold tracking-wide text-[#163024]">
                      {content.businessLegalName || 'OJAS – Pure by Nature'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm">
                      {content.businessAddress}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                      Phone: {content.contactPhone} · Email: {content.contactEmail}
                    </p>
                    {content.gstin && (
                      <p className="text-xs font-semibold text-slate-800 mt-1 tabular-nums">
                        GSTIN: {content.gstin}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#B88A3B]">
                      Tax Invoice
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums">
                      Invoice #: INV-{order.orderNumber}
                    </p>
                    <p className="text-xs text-slate-600 tabular-nums">
                      Order #: {order.orderNumber}
                    </p>
                    <p className="text-xs text-slate-600 tabular-nums">
                      Date:{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Billed &amp; Shipped To
                    </p>
                    <p className="font-semibold text-sm text-slate-900">{order.customerName}</p>
                    <p className="text-slate-700 mt-0.5">{order.deliveryAddress}</p>
                    <p className="text-slate-700">
                      {order.city} – {order.pincode}
                    </p>
                    <p className="text-slate-700 mt-1 tabular-nums">
                      Mobile: {order.mobileNumber}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Payment &amp; Dispatch Details
                    </p>
                    <p>
                      Payment Method: <strong className="text-slate-900">{order.paymentMethod}</strong>
                    </p>
                    <p>
                      Payment Status: <strong className="text-slate-900">{order.paymentStatus}</strong>
                    </p>
                    {order.upiTransactionId && (
                      <p className="font-mono">UTR / Ref: {order.upiTransactionId}</p>
                    )}
                    <p>
                      Courier:{' '}
                      <strong className="text-slate-900">
                        {order.deliveryPartner || order.courierName || 'Studio Direct Dispatch'}
                      </strong>
                    </p>
                    {order.trackingNumber && (
                      <p className="tabular-nums">AWB / Tracking ID: {order.trackingNumber}</p>
                    )}
                  </div>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="text-left p-2.5 border border-slate-200">Item &amp; Variant</th>
                      <th className="text-center p-2.5 border border-slate-200">Qty</th>
                      <th className="text-right p-2.5 border border-slate-200">Unit Rate</th>
                      <th className="text-right p-2.5 border border-slate-200">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 border border-slate-200">
                          <span className="font-medium text-slate-900">{item.productName}</span>
                          <span className="text-slate-500 block">{item.variantLabel}</span>
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-right tabular-nums">
                          {formatINR(item.price)}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-right font-semibold tabular-nums">
                          {formatINR(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
                  <div className="text-[11px] text-slate-500 max-w-sm space-y-1">
                    <p>
                      All prices are inclusive of applicable GST ({order.gstRate}%).
                    </p>
                    <p>
                      Customer Care: {content.contactPhone} · {content.contactEmail}
                    </p>
                  </div>

                  <div className="w-full sm:w-72 space-y-1.5 text-xs border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Taxable Value</span>
                      <span className="tabular-nums font-medium">{formatINR(taxableValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">CGST ({(order.gstRate / 2).toFixed(1)}%)</span>
                      <span className="tabular-nums">{formatINR(cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">SGST ({(order.gstRate / 2).toFixed(1)}%)</span>
                      <span className="tabular-nums">{formatINR(sgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Delivery Charges</span>
                      <span className="tabular-nums">
                        {order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-bold text-[#163024]">
                      <span>Grand Total</span>
                      <span className="tabular-nums">{formatINR(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Confirm / Cancel Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quick Order Actions
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {order.customerName} · <span className="tabular-nums">{order.mobileNumber}</span> ·{' '}
                    <strong className="text-[#163024] tabular-nums">{formatINR(order.totalAmount)}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {order.status !== 'Confirmed' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction(() => onUpdateStatus(order.id, 'Confirmed', 'Order confirmed by Owner'))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#163024] disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Order</span>
                    </button>
                  )}
                  {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction(() => onUpdateStatus(order.id, 'Delivered', 'Marked Delivered by Owner'))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Delivered</span>
                    </button>
                  )}
                  {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction(() => onUpdateStatus(order.id, 'Cancelled', 'Cancelled by Owner'))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Order</span>
                    </button>
                  )}
                  <a
                    href={buildWhatsAppChatUrl(order.mobileNumber, whatsappCustomerMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-100"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#1B4332]" />
                    <span>Message Customer</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Customer & Items */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Delivery Address &amp; Notes
                    </h3>
                    <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                    <p className="text-xs text-slate-600 tabular-nums">{order.mobileNumber}</p>
                    <p className="text-xs text-slate-700 mt-1">
                      {order.deliveryAddress}, {order.city} – {order.pincode}
                    </p>
                    {order.notes && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                        Customer Note: {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Items Ordered
                    </h3>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-2">
                          <div>
                            <p className="font-medium text-slate-900">{item.productName}</p>
                            <p className="text-slate-500 tabular-nums">
                              {item.variantLabel} × {item.quantity} @ {formatINR(item.price)}
                            </p>
                          </div>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {formatINR(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal (Incl. {order.gstRate}% GST: {formatINR(order.gstAmount)})</span>
                        <span className="tabular-nums">{formatINR(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Customer Shipping Fee</span>
                        <span className="tabular-nums">
                          {order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-[#163024] pt-1">
                        <span>Total Payable</span>
                        <span className="tabular-nums">{formatINR(order.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Verification Panel */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#1B4332]" />
                      <span>Payment Verification</span>
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        order.paymentStatus === 'Verified Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.paymentStatus === 'Verification Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : order.paymentStatus === 'Payment Rejected' || order.paymentStatus === 'Refunded'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p>
                      Method: <strong className="text-slate-900">{order.paymentMethod}</strong>
                    </p>
                    {order.upiTransactionId && (
                      <p>
                        UTR / Ref ID:{' '}
                        <strong className="font-mono text-slate-900">{order.upiTransactionId}</strong>
                        {order.upiPayerApp && ` (${order.upiPayerApp})`}
                      </p>
                    )}
                    {order.paymentProofUrl && (
                      <a
                        href={order.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#1B4332] font-semibold underline"
                      >
                        <span>View Uploaded Payment Screenshot</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {order.paymentVerifiedAt && (
                      <p className="text-emerald-700 tabular-nums">
                        Verified at:{' '}
                        {new Date(order.paymentVerifiedAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 pt-1">
                      Payments are only marked Verified Paid when explicitly confirmed by the Owner after checking bank/UPI statement or COD settlement.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isCod && order.paymentStatus !== 'Verified Paid' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAction(() => onVerifyPayment(order.id, 'verify'))}
                        className="px-3 py-1.5 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332] disabled:opacity-50"
                      >
                        Approve UPI Payment
                      </button>
                    )}
                    {isCod && order.paymentStatus !== 'Verified Paid' && order.status !== 'Cancelled' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAction(() => onVerifyPayment(order.id, 'collect_cod'))}
                        className="px-3 py-1.5 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332] disabled:opacity-50"
                      >
                        Confirm COD Cash Received
                      </button>
                    )}
                    {order.paymentStatus !== 'Payment Rejected' && order.paymentStatus !== 'Verified Paid' && !isCod && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAction(() => onVerifyPayment(order.id, 'reject'))}
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject Payment Proof
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Update & Manual Courier Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Update Order Status
                  </h3>
                  <div className="space-y-2.5">
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Optional status note (e.g. Packed in eco box)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleAction(() => onUpdateStatus(order.id, statusDraft, statusNote))
                      }
                      className="px-4 py-2 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332] disabled:opacity-50"
                    >
                      Save Order Status
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#1B4332]" />
                      <span>Manual Courier &amp; Dispatch</span>
                    </h3>
                    <span className="text-[11px] text-amber-700 font-medium">Manual Entry</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={deliveryPartner}
                      onChange={(e) => {
                        setDeliveryPartner(e.target.value);
                        setCourierName(e.target.value);
                      }}
                      placeholder="Courier Partner (e.g. Delhivery, DTDC)"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Tracking / AWB Number"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
                    />
                    <input
                      type="number"
                      min={0}
                      value={courierCharges}
                      onChange={(e) => setCourierCharges(Number(e.target.value))}
                      placeholder="Actual Courier Cost (₹)"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleAction(() =>
                          onUpdateCourier(order.id, {
                            courierName: courierName || deliveryPartner,
                            deliveryPartner: deliveryPartner || courierName,
                            trackingNumber,
                            courierCharges,
                            status:
                              trackingNumber &&
                              ['Confirmed', 'Processing', 'Packed'].includes(order.status)
                                ? 'Shipped'
                                : order.status,
                          })
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332] disabled:opacity-50"
                    >
                      Save Courier Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Returns & Refunds + Status History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-[#B88A3B]" />
                    <span>Return &amp; Refund Management</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={refundStatus}
                      onChange={(e) => setRefundStatus(e.target.value as RefundStatus)}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                    >
                      {REFUND_STATUSES.map((rs) => (
                        <option key={rs} value={rs}>
                          Refund: {rs}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={order.totalAmount}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      placeholder="Refund Amount (₹)"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
                    />
                  </div>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Return / refund reason or settlement note"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      handleAction(() =>
                        onUpdateRefund(order.id, {
                          refundStatus,
                          refundAmount,
                          returnReason,
                          markReturned: refundStatus === 'Refunded',
                        })
                      )
                    }
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold disabled:opacity-50"
                  >
                    Update Return / Refund
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Complete Status History</span>
                  </h3>
                  <div className="max-h-44 overflow-y-auto space-y-2.5 pr-1">
                    {(order.statusHistory || [])
                      .slice()
                      .reverse()
                      .map((entry, idx) => (
                        <div
                          key={idx}
                          className="text-xs border-l-2 border-[#B88A3B] pl-3 py-0.5 space-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#163024]">{entry.status}</span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {new Date(entry.timestamp).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600">{entry.note}</p>
                          <p className="text-[11px] text-slate-400">Updated by: {entry.updatedBy}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
