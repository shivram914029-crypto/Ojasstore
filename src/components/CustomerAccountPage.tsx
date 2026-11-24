import React, { useCallback, useEffect, useState } from 'react';
import {
  Package,
  MapPin,
  User,
  LogOut,
  Truck,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SafeImage } from './BrandMark';
import { UpiPayment } from './UpiPayment';
import { customerFetch, formatIndianMobile10 } from '../utils/customerAuth';
import { buildWhatsAppChatUrl, formatINR } from '../utils/whatsapp';
import type {
  CustomerAddress,
  CustomerUser,
  Order,
  OrderStatus,
  SiteContent,
} from '../types';

interface CustomerAccountPageProps {
  customerUser: CustomerUser | null;
  content: SiteContent;
  onCustomerUpdated: (customer: CustomerUser) => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

const TIMELINE_STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: 'Pending Confirmation', label: 'Requested' },
  { status: 'Confirmed', label: 'Confirmed' },
  { status: 'Packed', label: 'Packed' },
  { status: 'Shipped', label: 'Shipped' },
  { status: 'Delivered', label: 'Delivered' },
];

function getTimelineIndex(status: OrderStatus): number {
  if (status === 'Pending' || status === 'Pending Confirmation' || status === 'Payment Verification Pending') {
    return 0;
  }
  if (status === 'Confirmed' || status === 'Processing') return 1;
  if (status === 'Packed') return 2;
  if (status === 'Shipped' || status === 'Out for Delivery') return 3;
  if (status === 'Delivered' || status === 'Returned') return 4;
  return 0;
}

export const CustomerAccountPage: React.FC<CustomerAccountPageProps> = ({
  customerUser,
  content,
  onCustomerUpdated,
  onLogout,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'history'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  // Profile state
  const [profileName, setProfileName] = useState(customerUser?.name || '');
  const [profileMobile10, setProfileMobile10] = useState(
    formatIndianMobile10(customerUser?.mobileNumber)
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  // Address Editor state
  const [editingAddressId, setEditingAddressId] = useState<number | 'new' | null>(null);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrMobile, setAddrMobile] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrDefault, setAddrDefault] = useState(false);
  const [addrError, setAddrError] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3200);
  };

  const loadAccountData = useCallback(async () => {
    if (!customerUser) return;
    setLoadingAccount(true);
    try {
      const res = await customerFetch('/api/customer/account');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setAddresses(data.addresses || []);
        if (data.orders?.length > 0) {
          setExpandedOrderId((prev) => prev ?? data.orders[0].id);
        }
        if (data.customer) {
          onCustomerUpdated(data.customer);
        }
      }
    } finally {
      setLoadingAccount(false);
    }
  }, [customerUser?.id]);

  useEffect(() => {
    if (customerUser) {
      setProfileName(customerUser.name || '');
      setProfileMobile10(formatIndianMobile10(customerUser.mobileNumber));
      loadAccountData();
    }
  }, [customerUser?.id, loadAccountData]);

  if (!customerUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 sm:py-24">
        <div className="p-8 sm:p-10 rounded-2xl bg-white border border-[#E5DEC9] text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#F2EFE6] border border-[#E5DEC9] flex items-center justify-center mx-auto">
            <Phone className="w-6 h-6 text-[#163024]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-semibold text-[#163024]">
              My OJAS Account
            </h1>
            <p className="text-sm text-[#525E56] leading-relaxed">
              Enter your full name and mobile number to view your orders, track deliveries, and
              manage saved delivery addresses.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="flex-1 py-3 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold"
            >
              Login / Continue
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/products')}
              className="flex-1 py-3 px-5 rounded-lg border border-[#E5DEC9] bg-[#FAF8F3] hover:bg-[#F2EFE6] transition-colors text-sm font-semibold text-[#163024]"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'active') {
      return o.status !== 'Delivered' && o.status !== 'Cancelled';
    }
    if (orderFilter === 'history') {
      return o.status === 'Delivered' || o.status === 'Cancelled';
    }
    return true;
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setSavingProfile(true);
    try {
      const res = await customerFetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          mobileNumber: profileMobile10.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update profile.');
      onCustomerUpdated(data.customer);
      setProfileMsg('Your profile details have been updated.');
    } catch (err: any) {
      setProfileErr(err?.message || 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const startNewAddress = () => {
    setEditingAddressId('new');
    setAddrLabel('Home');
    setAddrRecipient(customerUser.name || '');
    setAddrMobile(formatIndianMobile10(customerUser.mobileNumber));
    setAddrStreet('');
    setAddrCity('');
    setAddrPincode('');
    setAddrDefault(addresses.length === 0);
    setAddrError('');
  };

  const startEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label);
    setAddrRecipient(addr.recipientName);
    setAddrMobile(formatIndianMobile10(addr.mobileNumber));
    setAddrStreet(addr.deliveryAddress);
    setAddrCity(addr.city);
    setAddrPincode(addr.pincode);
    setAddrDefault(addr.isDefault);
    setAddrError('');
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError('');
    setSavingAddr(true);
    try {
      const isNew = editingAddressId === 'new';
      const url = isNew
        ? '/api/customer/addresses'
        : `/api/customer/addresses/${editingAddressId}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await customerFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: addrLabel,
          recipientName: addrRecipient,
          mobileNumber: `+91${formatIndianMobile10(addrMobile)}`,
          deliveryAddress: addrStreet,
          city: addrCity,
          pincode: addrPincode,
          isDefault: addrDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save address.');
      setEditingAddressId(null);
      await loadAccountData();
      showToast(isNew ? 'Delivery address added.' : 'Delivery address updated.');
    } catch (err: any) {
      setAddrError(err?.message || 'Unable to save address.');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    const res = await customerFetch(`/api/customer/addresses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAccountData();
      showToast('Address removed.');
    }
  };

  const handleSetDefaultAddress = async (addr: CustomerAddress) => {
    const res = await customerFetch(`/api/customer/addresses/${addr.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      await loadAccountData();
      showToast('Default delivery address updated.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-[#163024] text-[#FAF8F3] border border-[#B88A3B] text-sm font-medium shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-[#D4AF63]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DEC9]">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
            Customer Account
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#163024] mt-1">
            {customerUser.name ? `Namaste, ${customerUser.name}` : 'Welcome to OJAS'}
          </h1>
          <p className="text-xs sm:text-sm text-[#525E56] mt-1 tabular-nums">
            Mobile Number: <strong className="text-[#163024]">{customerUser.mobileNumber}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/products')}
            className="px-4 py-2 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] text-xs font-semibold text-[#163024]"
          >
            Shop Products
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5 text-[#D4AF63]" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] w-fit">
        {[
          { id: 'orders', label: `My Orders & Tracking (${orders.length})`, icon: Package },
          { id: 'addresses', label: `Saved Addresses (${addresses.length})`, icon: MapPin },
          { id: 'profile', label: 'My Profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white text-[#163024] shadow-xs'
                  : 'text-[#525E56] hover:text-[#163024]'
              }`}
            >
              <Icon className="w-4 h-4 text-[#B88A3B]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MY ORDERS & ORDER TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-semibold text-[#163024]">
              My Orders &amp; Delivery Tracking
            </h2>
            <div className="inline-flex rounded-lg border border-[#E5DEC9] bg-white p-1">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'active', label: 'Active' },
                { id: 'history', label: 'Order History' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    orderFilter === f.id
                      ? 'bg-[#163024] text-[#FAF8F3]'
                      : 'text-[#525E56] hover:text-[#163024]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loadingAccount && orders.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white border border-[#E5DEC9] text-center text-sm text-[#525E56]">
              Loading your orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white border border-[#E5DEC9] text-center space-y-4">
              <p className="text-sm text-[#525E56]">
                {orderFilter === 'all'
                  ? 'You have not placed any orders yet.'
                  : 'No orders found in this view.'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/products')}
                className="px-5 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-xs font-semibold"
              >
                Explore OJAS Products
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isCancelled = order.status === 'Cancelled';
                const currentStepIndex = getTimelineIndex(order.status);
                const isExpanded = expandedOrderId === order.id;
                const helpMsg = `Namaste Ojas Customer Care, I would like an update on my order ${order.orderNumber} (Status: ${order.status}).`;

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl bg-white border border-[#E5DEC9] overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DEC9] bg-[#FAF8F3]/60">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5 text-xs">
                          <span className="font-semibold text-base text-[#163024] tabular-nums">
                            {order.orderNumber}
                          </span>
                          <span className="text-[#525E56]">·</span>
                          <span className="text-[#525E56]">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[#525E56]">·</span>
                          <span
                            className={`font-semibold ${
                              isCancelled
                                ? 'text-red-700'
                                : order.status === 'Delivered'
                                ? 'text-[#1B4332]'
                                : 'text-[#B88A3B]'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#525E56]">
                          {order.items
                            .map((i) => `${i.productName} (${i.variantLabel}) × ${i.quantity}`)
                            .join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-left sm:text-right">
                          <p className="text-[11px] uppercase tracking-wider text-[#525E56]">
                            Total Payable
                          </p>
                          <p className="text-base font-semibold text-[#163024] tabular-nums">
                            {formatINR(order.totalAmount)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] text-xs font-semibold text-[#163024]"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Track & Details'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 sm:p-6 space-y-6">
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                            Delivery Progress Timeline
                          </h3>

                          {isCancelled ? (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-sm text-red-800">
                              <XCircle className="w-5 h-5 shrink-0" />
                              <span>
                                This order was marked as Cancelled. Contact Ojas Customer Care on
                                WhatsApp if you need assistance.
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              {TIMELINE_STEPS.map((step, idx) => {
                                const completed = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                return (
                                  <div
                                    key={step.status}
                                    className={`p-3 rounded-xl border transition-colors ${
                                      isCurrent
                                        ? 'bg-[#163024] text-[#FAF8F3] border-[#163024]'
                                        : completed
                                        ? 'bg-[#F2EFE6] text-[#163024] border-[#B88A3B]/50'
                                        : 'bg-[#FAF8F3] text-[#525E56]/70 border-[#E5DEC9]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {completed ? (
                                        <CheckCircle2
                                          className={`w-4 h-4 shrink-0 ${
                                            isCurrent ? 'text-[#D4AF63]' : 'text-[#1B4332]'
                                          }`}
                                        />
                                      ) : (
                                        <Clock className="w-4 h-4 shrink-0 opacity-60" />
                                      )}
                                      <span className="text-xs font-semibold">{step.label}</span>
                                    </div>
                                    <p
                                      className={`text-[11px] mt-1 ${
                                        isCurrent ? 'text-[#D6DDD8]' : 'text-[#525E56]'
                                      }`}
                                    >
                                      {step.status}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Truck className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                                Courier &amp; Shipment Tracking
                              </p>
                              {order.deliveryPartner || order.courierName || order.trackingNumber ? (
                                <div className="space-y-1 mt-0.5">
                                  <p className="text-sm text-[#163024]">
                                    Courier:{' '}
                                    <strong>{order.deliveryPartner || order.courierName || 'Assigned Courier'}</strong>
                                    {order.trackingNumber && (
                                      <>
                                        {' · '}Tracking ID:{' '}
                                        <strong className="tabular-nums">{order.trackingNumber}</strong>
                                      </>
                                    )}
                                  </p>
                                  {(order.dispatchedAt || order.deliveredAt) && (
                                    <p className="text-xs text-[#525E56] tabular-nums">
                                      {order.dispatchedAt && `Dispatched: ${new Date(order.dispatchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                      {order.dispatchedAt && order.deliveredAt ? ' · ' : ''}
                                      {order.deliveredAt && `Delivered: ${new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-[#525E56] mt-0.5">
                                  Courier details and tracking number will appear here once your order is dispatched.
                                </p>
                              )}
                            </div>
                          </div>

                          <a
                            href={buildWhatsAppChatUrl(content.whatsappNumber, helpMsg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-xs font-semibold shrink-0 self-start sm:self-center"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#D4AF63]" />
                            <span>WhatsApp Support</span>
                          </a>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-[#E5DEC9]">
                          <div className="space-y-2.5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                              Order Items
                            </h4>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                  <SafeImage
                                    src={item.image}
                                    alt={item.productName}
                                    className="w-12 h-12 rounded-lg object-cover border border-[#E5DEC9] shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[#163024] truncate">
                                      {item.productName}
                                    </p>
                                    <p className="text-xs text-[#525E56] tabular-nums">
                                      {item.variantLabel} × {item.quantity} ({formatINR(item.price)} each)
                                    </p>
                                  </div>
                                  <span className="font-semibold text-[#163024] tabular-nums">
                                    {formatINR(item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2.5 text-sm">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                              Delivery &amp; Payment Summary
                            </h4>
                            <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] space-y-1.5 text-xs sm:text-sm">
                              <p className="font-semibold text-[#163024]">{order.customerName}</p>
                              <p className="text-[#525E56] tabular-nums">{order.mobileNumber}</p>
                              <p className="text-[#525E56]">
                                {order.deliveryAddress}, {order.city} – {order.pincode}
                              </p>
                              <p className="text-[#1B4332] pt-1">
                                Payment: <span className="font-medium">{order.paymentMethod}</span>
                              </p>
                              <p className="text-xs text-[#525E56]">
                                Payment Status:{' '}
                                <strong className="text-[#163024]">{order.paymentStatus}</strong>
                                {order.upiTransactionId ? (
                                  <span className="font-mono"> · UTR: {order.upiTransactionId}</span>
                                ) : null}
                              </p>
                              <div className="pt-2 border-t border-[#E5DEC9] flex justify-between text-xs text-[#525E56]">
                                <span>Subtotal / Shipping</span>
                                <span className="tabular-nums">
                                  {formatINR(order.subtotal)} /{' '}
                                  {order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {order.paymentMethod.toLowerCase().includes('upi') &&
                          order.status !== 'Cancelled' && (
                            <UpiPayment
                              amount={order.totalAmount}
                              orderNumber={order.orderNumber}
                              paymentStatus={order.paymentStatus}
                              upiTransactionId={order.upiTransactionId}
                              upiPayerApp={order.upiPayerApp}
                              verificationMobile={order.mobileNumber}
                              contactPhone={content.contactPhone}
                              compact
                              onOrderUpdated={(updatedOrder) => {
                                setOrders((prev) =>
                                  prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
                                );
                              }}
                            />
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED DELIVERY ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#163024]">
                Saved Delivery Addresses
              </h2>
              <p className="text-xs text-[#525E56] mt-0.5">
                Your default address automatically fills at checkout and WhatsApp ordering.
              </p>
            </div>
            {editingAddressId === null && (
              <button
                type="button"
                onClick={startNewAddress}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-xs sm:text-sm font-semibold"
              >
                <Plus className="w-4 h-4 text-[#D4AF63]" />
                <span>Add New Address</span>
              </button>
            )}
          </div>

          {editingAddressId !== null && (
            <form
              onSubmit={handleSaveAddress}
              className="p-6 rounded-2xl bg-white border border-[#1B4332] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-semibold text-[#163024]">
                  {editingAddressId === 'new' ? 'Add Delivery Address' : 'Edit Delivery Address'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingAddressId(null)}
                  className="text-xs font-semibold text-[#525E56] hover:text-[#163024]"
                >
                  Cancel
                </button>
              </div>

              {addrError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {addrError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                    Address Label
                  </label>
                  <input
                    type="text"
                    required
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    placeholder="Home / Office"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrRecipient}
                    onChange={(e) => setAddrRecipient(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                    Delivery Contact Phone (+91) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={addrMobile}
                    onChange={(e) => setAddrMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                  Complete Street Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="House / Flat No., Building, Street, Landmark"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                    City / State *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={addrPincode}
                    onChange={(e) => setAddrPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit PIN"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm tabular-nums"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-[#163024] cursor-pointer">
                <input
                  type="checkbox"
                  checked={addrDefault}
                  onChange={(e) => setAddrDefault(e.target.checked)}
                  className="accent-[#163024]"
                />
                <span>Set as default delivery address</span>
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAddressId(null)}
                  className="px-4 py-2.5 rounded-lg border border-[#E5DEC9] text-xs font-semibold text-[#163024]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddr}
                  className="px-5 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-xs sm:text-sm font-semibold disabled:opacity-60"
                >
                  {savingAddr ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          )}

          {addresses.length === 0 && editingAddressId === null ? (
            <div className="p-10 rounded-2xl bg-white border border-[#E5DEC9] text-center space-y-3">
              <p className="text-sm text-[#525E56]">
                No saved delivery addresses yet. Add one for faster checkout.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-5 rounded-2xl bg-white border space-y-3 ${
                    addr.isDefault ? 'border-[#1B4332]' : 'border-[#E5DEC9]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold uppercase tracking-wider text-[#B88A3B]">
                          {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[#1B4332] font-semibold">· Default</span>
                        )}
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-[#163024] mt-0.5">
                        {addr.recipientName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditAddress(addr)}
                        className="p-2 rounded-lg border border-[#E5DEC9] hover:bg-[#F2EFE6] text-[#163024]"
                        aria-label="Edit address"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-2 rounded-lg border border-[#E5DEC9] hover:bg-red-50 text-red-700"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[#525E56] leading-relaxed">
                    {addr.deliveryAddress}
                    <br />
                    {addr.city} – <span className="tabular-nums">{addr.pincode}</span>
                  </p>
                  <p className="text-xs text-[#163024] tabular-nums">
                    Delivery Phone: {addr.mobileNumber}
                  </p>

                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(addr)}
                      className="text-xs font-semibold text-[#1B4332] hover:text-[#B88A3B]"
                    >
                      Set as Default Address
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-xl">
          <form
            onSubmit={handleSaveProfile}
            className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E5DEC9] space-y-5"
          >
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#163024]">My Profile</h2>
              <p className="text-xs text-[#525E56] mt-1">
                Update your full name or registered mobile number anytime.
              </p>
            </div>

            {profileErr && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {profileErr}
              </div>
            )}
            {profileMsg && (
              <div className="p-3 rounded-lg bg-[#F2EFE6] border border-[#E5DEC9] text-xs text-[#163024]">
                {profileMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                Customer Full Name *
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
              />
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
                  maxLength={10}
                  value={profileMobile10}
                  onChange={(e) =>
                    setProfileMobile10(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 rounded-r-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div className="pt-1 text-xs text-[#525E56]">
              Member since{' '}
              {new Date(customerUser.createdAt).toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric',
              })}
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-sm font-semibold disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
