import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Truck,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CreditCard,
  Save,
  Eye,
  Info,
} from 'lucide-react';
import type {
  CategoryItem,
  Order,
  OrderStatus,
  Product,
  ProductVariant,
  RefundStatus,
} from '../../types';
import { formatINR } from '../../utils/whatsapp';

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==================== 1. CATEGORIES SECTION ==================== */
interface CategoriesSectionProps {
  categories: CategoryItem[];
  onCreateCategory: (payload: { name: string; description: string; active: boolean }) => Promise<void>;
  onUpdateCategory: (
    id: number,
    payload: { name: string; description: string; active: boolean }
  ) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onCreateCategory({ name: newName.trim(), description: newDesc.trim(), active: true });
      setNewName('');
      setNewDesc('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-[#163024] mb-3">Add Product Category</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name (e.g. Botanical Oils)"
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short category description"
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#163024] text-white text-sm font-semibold hover:bg-[#1B4332] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Create Category</span>
          </button>
        </form>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#163024]">
            Categories ({categories.length})
          </h3>
          <span className="text-xs text-slate-500">Saved permanently in SQLite database</span>
        </div>

        <div className="divide-y divide-slate-200">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            return (
              <div
                key={cat.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {isEditing ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await onUpdateCategory(cat.id, {
                              name: editName,
                              description: editDesc,
                              active: editActive,
                            });
                            setEditingId(null);
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#163024] text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-sm text-[#163024]">{cat.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            cat.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cat.active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cat.description || `Slug: ${cat.slug}`} ·{' '}
                        <span className="tabular-nums">{cat.productCount ?? 0} product(s)</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditName(cat.name);
                          setEditDesc(cat.description);
                          setEditActive(cat.active);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== 2. COURIER & DELIVERY SECTION ==================== */
interface CourierDeliverySectionProps {
  orders: Order[];
  courierApiConnected: boolean;
  onSaveCourier: (
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
  onOpenOrder: (order: Order) => void;
}

export const CourierDeliverySection: React.FC<CourierDeliverySectionProps> = ({
  orders,
  courierApiConnected,
  onSaveCourier,
  onOpenOrder,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending_dispatch' | 'in_transit' | 'delivered'>('all');
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        deliveryPartner: string;
        trackingNumber: string;
        courierCharges: number;
        status: OrderStatus;
      }
    >
  >({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'Cancelled' || o.status === 'Returned') return false;
      if (filter === 'pending_dispatch') {
        return ['Pending', 'Pending Confirmation', 'Payment Verification Pending', 'Confirmed', 'Processing', 'Packed'].includes(o.status);
      }
      if (filter === 'in_transit') {
        return ['Shipped', 'Out for Delivery'].includes(o.status);
      }
      if (filter === 'delivered') {
        return o.status === 'Delivered';
      }
      return true;
    });
  }, [orders, filter]);

  const getDraft = (o: Order) =>
    drafts[o.id] || {
      deliveryPartner: o.deliveryPartner || o.courierName || '',
      trackingNumber: o.trackingNumber || '',
      courierCharges: o.courierCharges || 0,
      status: o.status,
    };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-0.5">
          <p className="font-semibold">
            {courierApiConnected
              ? 'External Courier API Connected'
              : 'Manual Courier Tracking Mode (No external Courier API connected)'}
          </p>
          <p>
            Assign delivery partners, enter Tracking / AWB numbers, record actual courier charges for Profit &amp; Loss reporting, and update dispatch dates manually. Live external webhook polling requires Shiprocket/Delhivery API keys.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Shipments' },
            { id: 'pending_dispatch', label: 'Awaiting Dispatch' },
            { id: 'in_transit', label: 'In Transit / Out' },
            { id: 'delivered', label: 'Delivered' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                filter === tab.id
                  ? 'bg-[#163024] text-white border-[#163024]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          Total Courier Expense:{' '}
          <strong className="text-[#163024]">
            {formatINR(orders.reduce((s, o) => s + (o.courierCharges || 0), 0))}
          </strong>
        </span>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[880px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Order</th>
              <th className="p-3.5">Customer &amp; City</th>
              <th className="p-3.5">Delivery Partner</th>
              <th className="p-3.5">Tracking / AWB</th>
              <th className="p-3.5">Courier Cost (₹)</th>
              <th className="p-3.5">Shipment Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No orders matching this shipment filter.
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const draft = getDraft(o);
                return (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                      <div>{o.orderNumber}</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">{o.customerName}</div>
                      <div className="text-slate-500">
                        {o.city} – {o.pincode}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={draft.deliveryPartner}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [o.id]: { ...draft, deliveryPartner: e.target.value },
                          }))
                        }
                        placeholder="e.g. Delhivery / DTDC"
                        className="w-36 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                      />
                    </td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={draft.trackingNumber}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [o.id]: { ...draft, trackingNumber: e.target.value },
                          }))
                        }
                        placeholder="AWB / Tracking ID"
                        className="w-36 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs tabular-nums"
                      />
                    </td>
                    <td className="p-3.5">
                      <input
                        type="number"
                        min={0}
                        value={draft.courierCharges}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [o.id]: { ...draft, courierCharges: Number(e.target.value) },
                          }))
                        }
                        className="w-24 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs tabular-nums"
                      />
                    </td>
                    <td className="p-3.5">
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [o.id]: { ...draft, status: e.target.value as OrderStatus },
                          }))
                        }
                        className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                      >
                        {[
                          'Pending Confirmation',
                          'Confirmed',
                          'Processing',
                          'Packed',
                          'Shipped',
                          'Out for Delivery',
                          'Delivered',
                        ].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        disabled={savingId === o.id}
                        onClick={async () => {
                          setSavingId(o.id);
                          try {
                            await onSaveCourier(o.id, {
                              courierName: draft.deliveryPartner,
                              deliveryPartner: draft.deliveryPartner,
                              trackingNumber: draft.trackingNumber,
                              courierCharges: draft.courierCharges,
                              status: draft.status,
                            });
                          } finally {
                            setSavingId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#163024] text-white font-semibold hover:bg-[#1B4332] disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" />
                        <span>{savingId === o.id ? 'Saving' : 'Save'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenOrder(o)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== 3. TRACKING SECTION ==================== */
interface TrackingSectionProps {
  orders: Order[];
  onUpdateStatus: (orderId: number, status: OrderStatus, note?: string) => Promise<void>;
  onOpenOrder: (order: Order) => void;
}

export const TrackingSection: React.FC<TrackingSectionProps> = ({
  orders,
  onUpdateStatus,
  onOpenOrder,
}) => {
  const [query, setQuery] = useState('');
  const [checkpointNotes, setCheckpointNotes] = useState<Record<number, string>>({});

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders.slice(0, 20);
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.mobileNumber.includes(q)
    );
  }, [orders, query]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Order ID, AWB / Tracking ID, customer, or mobile..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <span className="text-xs text-slate-500">
          Updates written here sync immediately to the customer&apos;s Track My Orders timeline.
        </span>
      </div>

      <div className="space-y-4">
        {matched.map((order) => (
          <div
            key={order.id}
            className="rounded-xl bg-white border border-slate-200 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#1B4332]" />
                  <span className="font-semibold text-sm text-[#163024] tabular-nums">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs text-slate-500">· {order.customerName}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                  Partner: {order.deliveryPartner || order.courierName || 'Not assigned'} · AWB:{' '}
                  {order.trackingNumber || 'Pending'} · Status: <strong>{order.status}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenOrder(order)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Full Order
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 border-t md:border-t-0 pt-3 md:pt-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Checkpoint History
                </p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(order.statusHistory || [])
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <div key={i} className="text-xs border-l-2 border-[#1B4332] pl-2.5">
                        <span className="font-semibold text-slate-800">{h.status}</span>{' '}
                        <span className="text-slate-400 tabular-nums">
                          · {new Date(h.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <p className="text-slate-600">{h.note}</p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Add Manual Tracking Checkpoint
                </p>
                <input
                  type="text"
                  value={checkpointNotes[order.id] || ''}
                  onChange={(e) =>
                    setCheckpointNotes((prev) => ({ ...prev, [order.id]: e.target.value }))
                  }
                  placeholder="Checkpoint note (e.g. Dispatched from Ghitorni hub)"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  {(['Packed', 'Shipped', 'Out for Delivery', 'Delivered'] as OrderStatus[]).map(
                    (nextSt) => (
                      <button
                        key={nextSt}
                        type="button"
                        onClick={() => {
                          onUpdateStatus(
                            order.id,
                            nextSt,
                            checkpointNotes[order.id] || `Manual tracking update: ${nextSt}`
                          );
                          setCheckpointNotes((prev) => ({ ...prev, [order.id]: '' }));
                        }}
                        className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:border-[#163024] text-[11px] font-semibold text-slate-800"
                      >
                        Set {nextSt}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==================== 4. PAYMENTS SECTION ==================== */
interface PaymentsSectionProps {
  orders: Order[];
  onVerifyPayment: (orderId: number, action: 'verify' | 'reject' | 'collect_cod') => Promise<void>;
  onOpenOrder: (order: Order) => void;
}

export const PaymentsSection: React.FC<PaymentsSectionProps> = ({
  orders,
  onVerifyPayment,
  onOpenOrder,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending_verify' | 'paid' | 'unpaid' | 'refunded'>('all');

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'Cancelled');
    const totalSales = active.reduce((s, o) => s + o.totalAmount, 0);
    const verifiedReceived = active
      .filter((o) => o.paymentStatus === 'Verified Paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const pendingVerify = active
      .filter((o) => o.paymentStatus === 'Verification Pending')
      .reduce((s, o) => s + o.totalAmount, 0);
    const unpaidCod = active
      .filter((o) => o.paymentStatus === 'Unpaid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const refunds = orders
      .filter((o) => o.refundStatus === 'Refunded')
      .reduce((s, o) => s + (o.refundAmount || 0), 0);
    const gst = active.reduce((s, o) => s + (o.gstAmount || 0), 0);
    return { totalSales, verifiedReceived, pendingVerify, unpaidCod, refunds, gst };
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter === 'pending_verify') return o.paymentStatus === 'Verification Pending';
      if (filter === 'paid') return o.paymentStatus === 'Verified Paid';
      if (filter === 'unpaid') return o.paymentStatus === 'Unpaid' && o.status !== 'Cancelled';
      if (filter === 'refunded') return o.paymentStatus === 'Refunded' || o.refundStatus === 'Refunded';
      return true;
    });
  }, [orders, filter]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {[
          { label: 'Total Sales Value', value: formatINR(stats.totalSales), tone: 'text-[#163024]' },
          { label: 'Verified Received', value: formatINR(stats.verifiedReceived), tone: 'text-emerald-700' },
          { label: 'UPI Pending Verification', value: formatINR(stats.pendingVerify), tone: 'text-amber-700' },
          { label: 'Unpaid / COD Pending', value: formatINR(stats.unpaidCod), tone: 'text-slate-800' },
          { label: 'Refunds Processed', value: formatINR(stats.refunds), tone: 'text-red-700' },
          { label: 'Inclusive GST', value: formatINR(stats.gst), tone: 'text-[#163024]' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className={`text-lg font-bold mt-1 tabular-nums ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'pending_verify', label: 'UPI Verification Queue' },
            { id: 'paid', label: 'Verified Paid' },
            { id: 'unpaid', label: 'Unpaid / COD' },
            { id: 'refunded', label: 'Refunded' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                filter === tab.id
                  ? 'bg-[#163024] text-white border-[#163024]'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `ojas-payments-${new Date().toISOString().slice(0, 10)}.csv`,
              ['Order Number', 'Date', 'Customer', 'Method', 'UTR', 'Amount', 'GST', 'Payment Status', 'Order Status'],
              filtered.map((o) => [
                o.orderNumber,
                o.createdAt,
                o.customerName,
                o.paymentMethod,
                o.upiTransactionId || '',
                o.totalAmount,
                o.gstAmount,
                o.paymentStatus,
                o.status,
              ])
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Payment Ledger CSV</span>
        </button>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[820px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Order ID</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Method</th>
              <th className="p-3.5">UTR / Ref</th>
              <th className="p-3.5">Amount</th>
              <th className="p-3.5">Payment Status</th>
              <th className="p-3.5 text-right">Owner Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((o) => {
              const isCod = o.paymentMethod.toLowerCase().includes('cash');
              return (
                <tr key={o.id} className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                    {o.orderNumber}
                  </td>
                  <td className="p-3.5">
                    <div className="font-medium text-slate-900">{o.customerName}</div>
                    <div className="text-slate-500 tabular-nums">{o.mobileNumber}</div>
                  </td>
                  <td className="p-3.5 text-slate-700">{o.paymentMethod}</td>
                  <td className="p-3.5 font-mono text-slate-700">
                    {o.upiTransactionId || '—'}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-900 tabular-nums">
                    {formatINR(o.totalAmount)}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        o.paymentStatus === 'Verified Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.paymentStatus === 'Verification Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : o.paymentStatus === 'Payment Rejected' || o.paymentStatus === 'Refunded'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                    {!isCod && o.paymentStatus !== 'Verified Paid' && (
                      <button
                        type="button"
                        onClick={() => onVerifyPayment(o.id, 'verify')}
                        className="px-2.5 py-1 rounded bg-[#163024] text-white font-semibold hover:bg-[#1B4332]"
                      >
                        Verify Paid
                      </button>
                    )}
                    {isCod && o.paymentStatus !== 'Verified Paid' && o.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => onVerifyPayment(o.id, 'collect_cod')}
                        className="px-2.5 py-1 rounded bg-[#163024] text-white font-semibold hover:bg-[#1B4332]"
                      >
                        COD Collected
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenOrder(o)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== 5. INVENTORY / STOCK SECTION ==================== */
interface InventorySectionProps {
  products: Product[];
  onSaveProductStock: (
    productId: number,
    variants: ProductVariant[],
    active: boolean
  ) => Promise<void>;
}

export const InventorySection: React.FC<InventorySectionProps> = ({
  products,
  onSaveProductStock,
}) => {
  const [drafts, setDrafts] = useState<
    Record<number, { variants: ProductVariant[]; active: boolean }>
  >({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const summary = useMemo(() => {
    let totalSkus = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalUnits = 0;
    products.forEach((p) =>
      p.variants.forEach((v) => {
        totalSkus += 1;
        totalUnits += v.stock;
        if (v.stock === 0) outOfStock += 1;
        else if (v.stock < 10) lowStock += 1;
      })
    );
    return { totalSkus, lowStock, outOfStock, totalUnits };
  }, [products]);

  const getDraft = (p: Product) =>
    drafts[p.id] || {
      variants: p.variants.map((v) => ({ ...v })),
      active: p.active,
    };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Total SKUs</p>
          <p className="text-xl font-bold text-[#163024] mt-1 tabular-nums">{summary.totalSkus}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Total Units in Stock</p>
          <p className="text-xl font-bold text-[#163024] mt-1 tabular-nums">{summary.totalUnits}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Low Stock (&lt;10)</p>
          <p className="text-xl font-bold text-amber-700 mt-1 tabular-nums">{summary.lowStock}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Out of Stock</p>
          <p className="text-xl font-bold text-red-700 mt-1 tabular-nums">{summary.outOfStock}</p>
        </div>
      </div>

      <div className="space-y-4">
        {products.map((product) => {
          const draft = getDraft(product);
          return (
            <div key={product.id} className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-[#163024]">{product.name}</h3>
                  <p className="text-xs text-slate-500">{product.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [product.id]: { ...draft, active: e.target.checked },
                        }))
                      }
                    />
                    <span>{draft.active ? 'Published on Store' : 'Unpublished (Draft)'}</span>
                  </label>
                  <button
                    type="button"
                    disabled={savingId === product.id}
                    onClick={async () => {
                      setSavingId(product.id);
                      try {
                        await onSaveProductStock(product.id, draft.variants, draft.active);
                      } finally {
                        setSavingId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332] disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingId === product.id ? 'Saving...' : 'Save Stock & Price'}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[680px]">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Variant / Pack Size</th>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5">MRP / Compare At (₹)</th>
                      <th className="p-2.5">Selling Price (₹)</th>
                      <th className="p-2.5">Discount %</th>
                      <th className="p-2.5">Stock Qty</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {draft.variants.map((variant, idx) => (
                      <tr key={variant.id}>
                        <td className="p-2.5 font-medium text-slate-900">{variant.label}</td>
                        <td className="p-2.5 font-mono text-slate-500">{variant.sku}</td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min={0}
                            value={variant.compareAtPrice || ''}
                            placeholder="Optional"
                            onChange={(e) => {
                              const mrp = Number(e.target.value) || undefined;
                              const nextVariants = draft.variants.map((v, i) => {
                                if (i !== idx) return v;
                                const disc =
                                  mrp && mrp > v.price
                                    ? Math.round(((mrp - v.price) / mrp) * 100)
                                    : undefined;
                                return { ...v, compareAtPrice: mrp, discountPercent: disc };
                              });
                              setDrafts((prev) => ({
                                ...prev,
                                [product.id]: { ...draft, variants: nextVariants },
                              }));
                            }}
                            className="w-24 px-2 py-1 rounded border border-slate-300 tabular-nums"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min={0}
                            value={variant.price}
                            onChange={(e) => {
                              const price = Math.max(0, Number(e.target.value));
                              const nextVariants = draft.variants.map((v, i) => {
                                if (i !== idx) return v;
                                const disc =
                                  v.compareAtPrice && v.compareAtPrice > price
                                    ? Math.round(((v.compareAtPrice - price) / v.compareAtPrice) * 100)
                                    : undefined;
                                return { ...v, price, discountPercent: disc };
                              });
                              setDrafts((prev) => ({
                                ...prev,
                                [product.id]: { ...draft, variants: nextVariants },
                              }));
                            }}
                            className="w-24 px-2 py-1 rounded border border-slate-300 tabular-nums"
                          />
                        </td>
                        <td className="p-2.5 tabular-nums text-emerald-700 font-semibold">
                          {variant.discountPercent ? `${variant.discountPercent}% OFF` : '—'}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min={0}
                            value={variant.stock}
                            onChange={(e) => {
                              const stock = Math.max(0, Number(e.target.value));
                              const nextVariants = draft.variants.map((v, i) =>
                                i === idx ? { ...v, stock } : v
                              );
                              setDrafts((prev) => ({
                                ...prev,
                                [product.id]: { ...draft, variants: nextVariants },
                              }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-slate-300 tabular-nums"
                          />
                        </td>
                        <td className="p-2.5">
                          {variant.stock === 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Out of Stock
                            </span>
                          ) : variant.stock < 10 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==================== 6. RETURNS & REFUNDS SECTION ==================== */
interface ReturnsRefundsSectionProps {
  orders: Order[];
  onUpdateRefund: (
    orderId: number,
    payload: {
      refundStatus: RefundStatus;
      refundAmount: number;
      returnReason: string;
      markReturned?: boolean;
    }
  ) => Promise<void>;
  onOpenOrder: (order: Order) => void;
}

export const ReturnsRefundsSection: React.FC<ReturnsRefundsSectionProps> = ({
  orders,
  onUpdateRefund,
  onOpenOrder,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [status, setStatus] = useState<RefundStatus>('Requested');

  const returnCases = useMemo(
    () => orders.filter((o) => o.refundStatus !== 'None' || o.status === 'Returned'),
    [orders]
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#163024] flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#B88A3B]" />
          <span>Create or Update Return / Refund Case</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={selectedOrderId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedOrderId(id || '');
              const ord = orders.find((o) => o.id === id);
              if (ord) setAmount(ord.totalAmount);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
          >
            <option value="">Select Order...</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.customerName} ({formatINR(o.totalAmount)})
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RefundStatus)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
          >
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Refunded">Refunded</option>
            <option value="Rejected">Rejected</option>
          </select>

          <input
            type="number"
            min={0}
            max={selectedOrder?.totalAmount || undefined}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Refund Amount (₹)"
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
          />

          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Return reason / UTR reference"
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
          />
        </div>
        <button
          type="button"
          disabled={!selectedOrderId}
          onClick={async () => {
            if (!selectedOrderId) return;
            await onUpdateRefund(Number(selectedOrderId), {
              refundStatus: status,
              refundAmount: amount,
              returnReason: reason,
              markReturned: status === 'Refunded',
            });
            setReason('');
            setSelectedOrderId('');
          }}
          className="px-4 py-2 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332] disabled:opacity-40"
        >
          Save Return / Refund Case
        </button>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-[#163024]">
            Return &amp; Refund Ledger ({returnCases.length})
          </h3>
        </div>
        <table className="w-full text-xs text-left min-w-[740px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Order ID</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Order Amount</th>
              <th className="p-3.5">Refund Amount</th>
              <th className="p-3.5">Reason</th>
              <th className="p-3.5">Refund Status</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {returnCases.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No return or refund cases recorded yet.
                </td>
              </tr>
            ) : (
              returnCases.map((o) => (
                <tr key={o.id}>
                  <td className="p-3.5 font-semibold text-[#163024] tabular-nums">{o.orderNumber}</td>
                  <td className="p-3.5">{o.customerName}</td>
                  <td className="p-3.5 tabular-nums">{formatINR(o.totalAmount)}</td>
                  <td className="p-3.5 font-semibold text-red-700 tabular-nums">
                    {formatINR(o.refundAmount)}
                  </td>
                  <td className="p-3.5 text-slate-600">{o.returnReason || '—'}</td>
                  <td className="p-3.5 font-semibold">{o.refundStatus}</td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenOrder(o)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== 7. REPORTS & ANALYTICS (P&L) SECTION ==================== */
interface ReportsAnalyticsSectionProps {
  orders: Order[];
  dateLabel: string;
}

export const ReportsAnalyticsSection: React.FC<ReportsAnalyticsSectionProps> = ({
  orders,
  dateLabel,
}) => {
  const report = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'Cancelled');
    const delivered = orders.filter((o) => o.status === 'Delivered');
    const grossSales = active.reduce((s, o) => s + o.totalAmount, 0);
    const deliveredRevenue = delivered.reduce((s, o) => s + o.totalAmount, 0);
    const verifiedReceived = active
      .filter((o) => o.paymentStatus === 'Verified Paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const pendingPayments = active
      .filter((o) => o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Verification Pending')
      .reduce((s, o) => s + o.totalAmount, 0);
    const codRevenue = active
      .filter((o) => o.paymentMethod.toLowerCase().includes('cash'))
      .reduce((s, o) => s + o.totalAmount, 0);
    const onlineRevenue = active
      .filter((o) => !o.paymentMethod.toLowerCase().includes('cash'))
      .reduce((s, o) => s + o.totalAmount, 0);
    const customerShippingCollected = active.reduce((s, o) => s + o.shippingFee, 0);
    const courierExpensesPaid = active.reduce((s, o) => s + (o.courierCharges || 0), 0);
    const totalGst = active.reduce((s, o) => s + (o.gstAmount || 0), 0);
    const refundsIssued = orders
      .filter((o) => o.refundStatus === 'Refunded')
      .reduce((s, o) => s + (o.refundAmount || 0), 0);
    const netOperationalRevenue = grossSales - refundsIssued - totalGst - courierExpensesPaid;

    const productPerf = new Map<string, { name: string; units: number; revenue: number }>();
    active.forEach((o) => {
      o.items.forEach((item) => {
        const cur = productPerf.get(item.productName) || {
          name: item.productName,
          units: 0,
          revenue: 0,
        };
        cur.units += item.quantity;
        cur.revenue += item.price * item.quantity;
        productPerf.set(item.productName, cur);
      });
    });

    return {
      totalOrders: orders.length,
      deliveredCount: delivered.length,
      cancelledCount: orders.filter((o) => o.status === 'Cancelled').length,
      grossSales,
      deliveredRevenue,
      verifiedReceived,
      pendingPayments,
      codRevenue,
      onlineRevenue,
      customerShippingCollected,
      courierExpensesPaid,
      totalGst,
      refundsIssued,
      netOperationalRevenue,
      topProducts: Array.from(productPerf.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#163024]">
            Financial Profit &amp; Loss Statement ({dateLabel})
          </h3>
          <p className="text-xs text-slate-500">
            Calculated live from database orders, GST rates, manual courier costs, and processed refunds.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `ojas-pnl-report-${new Date().toISOString().slice(0, 10)}.csv`,
              ['Metric', 'Value'],
              [
                ['Filter Period', dateLabel],
                ['Total Orders', report.totalOrders],
                ['Delivered Orders', report.deliveredCount],
                ['Cancelled Orders', report.cancelledCount],
                ['Gross Order Sales (INR)', report.grossSales],
                ['Verified Payments Received (INR)', report.verifiedReceived],
                ['Pending / Unverified Payments (INR)', report.pendingPayments],
                ['Online UPI Revenue (INR)', report.onlineRevenue],
                ['COD Revenue (INR)', report.codRevenue],
                ['Customer Delivery Fees Billed (INR)', report.customerShippingCollected],
                ['Courier Expenses Paid (INR)', report.courierExpensesPaid],
                ['Total Inclusive GST (INR)', report.totalGst],
                ['Refunds Issued (INR)', report.refundsIssued],
                ['Net Revenue Ex-GST & Courier (INR)', report.netOperationalRevenue],
              ]
            )
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#163024] text-white text-xs font-semibold hover:bg-[#1B4332]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download P&amp;L CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[#1B4332]" />
            <span>Profit &amp; Loss Breakdown</span>
          </h4>
          <div className="divide-y divide-slate-100 text-sm">
            {[
              { label: 'Gross Sales (Active Orders)', val: formatINR(report.grossSales), bold: true },
              { label: '  · Verified Payments Received', val: formatINR(report.verifiedReceived) },
              { label: '  · Pending Payments (COD / Unverified)', val: formatINR(report.pendingPayments) },
              { label: '  · Customer Delivery Fees Collected', val: formatINR(report.customerShippingCollected) },
              { label: 'Less: Refunds Issued', val: `- ${formatINR(report.refundsIssued)}`, tone: 'text-red-700' },
              { label: 'Less: Inclusive GST Liability', val: `- ${formatINR(report.totalGst)}`, tone: 'text-amber-700' },
              { label: 'Less: Actual Courier Expenses Paid', val: `- ${formatINR(report.courierExpensesPaid)}`, tone: 'text-amber-700' },
              {
                label: 'Net Revenue (Ex-GST, Refunds & Courier)',
                val: formatINR(report.netOperationalRevenue),
                bold: true,
                tone: 'text-[#163024]',
              },
            ].map((row) => (
              <div key={row.label} className="py-2.5 flex items-center justify-between gap-4">
                <span className={`${row.bold ? 'font-semibold text-[#163024]' : 'text-slate-600'} text-xs sm:text-sm`}>
                  {row.label}
                </span>
                <span className={`tabular-nums ${row.bold ? 'font-bold' : 'font-medium'} ${row.tone || 'text-slate-900'}`}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Product Sales Performance
          </h4>
          {report.topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6">No product sales in selected date window.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {report.topProducts.map((prod) => (
                <div key={prod.name} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{prod.name}</p>
                    <p className="text-xs text-slate-500 tabular-nums">{prod.units} units sold</p>
                  </div>
                  <span className="font-semibold text-[#163024] tabular-nums">
                    {formatINR(prod.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
