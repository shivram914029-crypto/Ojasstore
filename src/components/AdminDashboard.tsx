import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  Truck,
  MapPin,
  Users,
  CreditCard,
  Boxes,
  RotateCcw,
  MessageSquare,
  BarChart3,
  Globe,
  UserCog,
  LogOut,
  Bell,
  Menu,
  X,
  Lock,
  KeyRound,
  Plus,
  Trash2,
  Upload,
  Check,
  Edit3,
  Search,
  ExternalLink,
  Download,
  FileText,
  Eye,
  MessageCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BrandMark, SafeImage } from './BrandMark';
import { AdminCharts } from './admin/AdminCharts';
import { OrderDetailInvoiceModal } from './admin/OrderDetailInvoiceModal';
import {
  CategoriesSection,
  CourierDeliverySection,
  InventorySection,
  PaymentsSection,
  ReportsAnalyticsSection,
  ReturnsRefundsSection,
  TrackingSection,
} from './admin/AdminSections';
import { buildWhatsAppChatUrl, formatINR } from '../utils/whatsapp';
import type {
  AdminCustomerSummary,
  AdminUser,
  CategoryItem,
  ContactMessage,
  CustomerAddress,
  CustomerUser,
  Order,
  OrderStatus,
  Product,
  ProductVariant,
  RefundStatus,
  SiteContent,
  SupportTicketStatus,
} from '../types';

interface AdminDashboardProps {
  onStorefrontUpdated: () => void;
  onNavigate: (path: string) => void;
}

type SidebarSection =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'categories'
  | 'courier'
  | 'tracking'
  | 'customers'
  | 'payments'
  | 'inventory'
  | 'returns'
  | 'support'
  | 'reports'
  | 'settings'
  | 'profile';

type DateRangePreset = 'all' | 'today' | '7d' | '30d' | '90d' | 'custom';

const ORDER_STATUSES: OrderStatus[] = [
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

const SESSION_TOKEN_KEY = 'ojas_admin_session_token';

function getStoredSessionToken(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredSessionToken(token: string | null) {
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage unavailability
  }
}

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getStoredSessionToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (res.status === 401) {
    setStoredSessionToken(null);
  }
  return res;
}

function downloadOrdersCsv(filename: string, orders: Order[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headers = [
    'Order ID',
    'Date',
    'Customer Name',
    'Mobile Number',
    'City',
    'Pincode',
    'Items',
    'Subtotal',
    'GST Amount',
    'Shipping Fee',
    'Total Amount',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'Delivery Partner',
    'Tracking ID',
  ];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.createdAt,
    o.customerName,
    o.mobileNumber,
    o.city,
    o.pincode,
    o.items.map((i) => `${i.productName} (${i.variantLabel}) x${i.quantity}`).join(' | '),
    o.subtotal,
    o.gstAmount,
    o.shippingFee,
    o.totalAmount,
    o.paymentMethod,
    o.paymentStatus,
    o.status,
    o.deliveryPartner || o.courierName || '',
    o.trackingNumber || '',
  ]);
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
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

function getStatusPillClass(status: string): string {
  switch (status) {
    case 'Delivered':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Cancelled':
    case 'Returned':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Shipped':
    case 'Out for Delivery':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'Confirmed':
    case 'Processing':
    case 'Packed':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    default:
      return 'bg-amber-50 text-amber-800 border-amber-200';
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onStorefrontUpdated,
  onNavigate,
}) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'setup' | 'reset'>('login');
  const [needsSetup, setNeedsSetup] = useState(false);

  // Login / Setup / Reset state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [setupName, setSetupName] = useState('OJAS Owner');
  const [setupKey, setSetupKey] = useState('');
  const [personalRecoveryKey, setPersonalRecoveryKey] = useState('');
  const [resetCurrentEmail, setResetCurrentEmail] = useState('');
  const [resetNewEmail, setResetNewEmail] = useState('');
  const [resetRecoveryKey, setResetRecoveryKey] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Shell & navigation state
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Dashboard date filters
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Data from backend
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [courierApiConnected, setCourierApiConnected] = useState(false);

  // Orders search, filter & modal
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [ordersPage, setOrdersPage] = useState(1);
  const [deliveredSearch, setDeliveredSearch] = useState('');
  const [deliveredPayFilter, setDeliveredPayFilter] = useState<'all' | 'Verified Paid' | 'Unpaid'>('all');
  const [deliveredPage, setDeliveredPage] = useState(1);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<'manage' | 'invoice'>('manage');

  // Customers state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<{
    customer: CustomerUser;
    addresses: CustomerAddress[];
    orders: Order[];
  } | null>(null);
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false);

  // Products modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Support ticket state
  const [supportFilter, setSupportFilter] = useState<'All' | SupportTicketStatus>('All');
  const [ticketReplyDrafts, setTicketReplyDrafts] = useState<Record<number, string>>({});

  // Content & Owner Security state
  const [savingContent, setSavingContent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [securityEmail, setSecurityEmail] = useState('');
  const [securityName, setSecurityName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRecoveryKey, setNewRecoveryKey] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3400);
  };

  const loadCustomers = async (query = customerSearch) => {
    const res = await adminFetch(`/api/admin/customers?search=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers || []);
    }
  };

  const loadCustomerDetail = async (customerId: number) => {
    setLoadingCustomerDetail(true);
    try {
      const res = await adminFetch(`/api/admin/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerDetail(data);
      }
    } finally {
      setLoadingCustomerDetail(false);
    }
  };

  const loadDashboard = async () => {
    const [dashRes, custRes] = await Promise.all([
      adminFetch('/api/admin/dashboard'),
      adminFetch(`/api/admin/customers?search=${encodeURIComponent(customerSearch.trim())}`),
    ]);
    if (dashRes.ok) {
      const data = await dashRes.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
      setOrders(data.orders || []);
      setContent(data.content || null);
      setMessages(data.messages || []);
      setCourierApiConnected(Boolean(data.integrations?.courierApiConnected));
      if (modalOrder) {
        const refreshed = (data.orders || []).find((o: Order) => o.id === modalOrder.id);
        if (refreshed) setModalOrder(refreshed);
      }
    }
    if (custRes.ok) {
      const custData = await custRes.json();
      setCustomers(custData.customers || []);
    }
  };

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/me').then((r) => r.json()),
      fetch('/api/admin/status').then((r) => r.json()).catch(() => ({ needsSetup: false })),
    ])
      .then(([meData, statusData]) => {
        const requiresSetup = Boolean(statusData?.needsSetup);
        setNeedsSetup(requiresSetup);
        if (meData.authenticated && meData.admin) {
          setAdminUser(meData.admin);
          setSecurityEmail(meData.admin.email || '');
          setSecurityName(meData.admin.name || '');
          loadDashboard();
        } else if (requiresSetup) {
          setAuthMode('setup');
        }
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthNotice('');
    setLoggingIn(true);
    try {
      const res = await adminFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');
      if (data.sessionToken) setStoredSessionToken(data.sessionToken);
      setAdminUser(data.admin);
      setSecurityEmail(data.admin.email || '');
      setSecurityName(data.admin.name || '');
      await loadDashboard();
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid owner credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSetupOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthNotice('');
    setLoggingIn(true);
    try {
      const res = await adminFetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setupName,
          email,
          password,
          setupKey,
          recoveryKey: personalRecoveryKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Owner setup failed.');
      if (data.sessionToken) setStoredSessionToken(data.sessionToken);
      setNeedsSetup(false);
      setAdminUser(data.admin);
      setSecurityEmail(data.admin.email || '');
      setSecurityName(data.admin.name || '');
      setSetupKey('');
      setPersonalRecoveryKey('');
      await loadDashboard();
    } catch (err: any) {
      setLoginError(err?.message || 'Could not initialize owner account.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthNotice('');
    setLoggingIn(true);
    try {
      const res = await adminFetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetCurrentEmail,
          newEmail: resetNewEmail || resetCurrentEmail,
          recoveryKey: resetRecoveryKey,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed.');
      if (data.sessionToken) setStoredSessionToken(data.sessionToken);
      setNeedsSetup(false);
      setAdminUser(data.admin);
      setSecurityEmail(data.admin.email || '');
      setSecurityName(data.admin.name || '');
      setResetRecoveryKey('');
      setResetNewPassword('');
      await loadDashboard();
    } catch (err: any) {
      setLoginError(err?.message || 'Unable to reset owner password.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' });
    setStoredSessionToken(null);
    setAdminUser(null);
    setEmail('');
    setPassword('');
    setAuthMode('login');
  };

  // Mutation handlers
  const handleOrderStatusChange = async (orderId: number, status: OrderStatus, note?: string) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      if (modalOrder?.id === orderId) setModalOrder(data.order);
      showToast(`Order ${data.order.orderNumber} updated to ${status}.`);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Could not update order status.');
    }
  };

  const handleSaveCourier = async (
    orderId: number,
    payload: {
      courierName: string;
      deliveryPartner: string;
      trackingNumber: string;
      courierCharges: number;
      status?: OrderStatus;
      note?: string;
    }
  ) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}/courier`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      if (modalOrder?.id === orderId) setModalOrder(data.order);
      showToast(`Courier details saved for ${data.order.orderNumber}.`);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to update courier details.');
    }
  };

  const handleVerifyPayment = async (
    orderId: number,
    action: 'verify' | 'reject' | 'collect_cod'
  ) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}/verify-payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      if (modalOrder?.id === orderId) setModalOrder(data.order);
      showToast(
        action === 'reject'
          ? `Payment rejected for ${data.order.orderNumber}.`
          : `Payment verified for ${data.order.orderNumber}.`
      );
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Could not update payment status.');
    }
  };

  const handleUpdateRefund = async (
    orderId: number,
    payload: {
      refundStatus: RefundStatus;
      refundAmount: number;
      returnReason: string;
      markReturned?: boolean;
    }
  ) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}/refund`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      if (modalOrder?.id === orderId) setModalOrder(data.order);
      showToast(`Return / Refund updated for ${data.order.orderNumber}.`);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to update return/refund.');
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await adminFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      showToast('Image uploaded successfully.');
      return data.url as string;
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload image.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingProduct(true);
    try {
      const url = isCreatingProduct
        ? '/api/admin/products'
        : `/api/admin/products/${editingProduct.id}`;
      const method = isCreatingProduct ? 'POST' : 'PUT';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product.');

      await loadDashboard();
      onStorefrontUpdated();
      setEditingProduct(null);
      setIsCreatingProduct(false);
      showToast('Product saved permanently.');
    } catch (err: any) {
      showToast(err?.message || 'Error saving product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveProductStock = async (
    productId: number,
    variants: ProductVariant[],
    active: boolean
  ) => {
    const res = await adminFetch(`/api/admin/products/${productId}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants, active }),
    });
    if (res.ok) {
      const data = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === productId ? data.product : p)));
      onStorefrontUpdated();
      showToast(`Stock & pricing saved for ${data.product.name}.`);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to save stock update.');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    const res = await adminFetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadDashboard();
      onStorefrontUpdated();
      showToast('Product deleted.');
    }
  };

  const handleCreateCategory = async (payload: {
    name: string;
    description: string;
    active: boolean;
  }) => {
    const res = await adminFetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to create category.');
      return;
    }
    await loadDashboard();
    showToast(`Category "${data.category.name}" created.`);
  };

  const handleUpdateCategory = async (
    id: number,
    payload: { name: string; description: string; active: boolean }
  ) => {
    const res = await adminFetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to update category.');
      return;
    }
    await loadDashboard();
    onStorefrontUpdated();
    showToast(`Category "${data.category.name}" updated.`);
  };

  const handleDeleteCategory = async (id: number) => {
    const res = await adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || 'Cannot delete category.');
      return;
    }
    await loadDashboard();
    showToast('Category deleted.');
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setSavingContent(true);
    try {
      const res = await adminFetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      if (!res.ok) throw new Error('Failed to save site settings.');
      onStorefrontUpdated();
      showToast('Website settings & branding updated.');
    } catch (err: any) {
      showToast(err?.message || 'Unable to save settings.');
    } finally {
      setSavingContent(false);
    }
  };

  const handleUpdateTicket = async (
    msgId: number,
    payload: { status?: SupportTicketStatus; replyNote?: string; readStatus?: boolean }
  ) => {
    const res = await adminFetch(`/api/admin/messages/${msgId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === msgId ? data.message : m)));
      showToast('Support ticket updated.');
    }
  };

  const handleSecurityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage('');
    setPwError('');
    const res = await adminFetch('/api/admin/security', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword,
        newEmail: securityEmail,
        newName: securityName,
        newPassword: newPassword || undefined,
        newRecoveryKey: newRecoveryKey || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPwError(data.error || 'Could not update owner security settings.');
      return;
    }
    setAdminUser(data.admin);
    setCurrentPassword('');
    setNewPassword('');
    setNewRecoveryKey('');
    setPwMessage('Owner login credentials updated successfully.');
  };

  const openNewProductForm = () => {
    setIsCreatingProduct(true);
    setEditingProduct({
      id: 0,
      slug: '',
      name: '',
      subtitle: '',
      category: categories[0]?.name || 'Natural Essentials',
      description: '',
      details: {
        highlights: ['Crafted in small batches with natural ingredients'],
        intendedUses: ['Everyday mindful household use'],
        materialsOrComposition: 'Natural botanical ingredients',
        storageAndCare: 'Store in a cool, dry place away from moisture.',
        craftNote: 'Natural household product crafted by OJAS in India.',
        origin: 'Crafted in India',
      },
      variants: [
        {
          id: `v-${Date.now()}`,
          label: '100g Standard Pack',
          price: 399,
          stock: 25,
          sku: `OJAS-${Date.now().toString().slice(-4)}`,
        },
      ],
      images: [],
      featured: true,
      active: true,
      sortOrder: products.length + 1,
      updatedAt: new Date().toISOString(),
    });
  };

  // Date-filtered orders & live metrics
  const dateLabel = useMemo(() => {
    switch (datePreset) {
      case 'today':
        return 'Today';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case '90d':
        return 'Last 90 Days';
      case 'custom':
        return customFrom || customTo
          ? `${customFrom || '...'} to ${customTo || '...'}`
          : 'Custom Range';
      default:
        return 'All Time';
    }
  }, [datePreset, customFrom, customTo]);

  const dateFilteredOrders = useMemo(() => {
    if (datePreset === 'all') return orders;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const daysMs = (d: number) => startOfToday - (d - 1) * 86400000;

    return orders.filter((o) => {
      const ts = new Date(o.createdAt).getTime();
      if (Number.isNaN(ts)) return true;
      if (datePreset === 'today') return ts >= startOfToday;
      if (datePreset === '7d') return ts >= daysMs(7);
      if (datePreset === '30d') return ts >= daysMs(30);
      if (datePreset === '90d') return ts >= daysMs(90);
      if (datePreset === 'custom') {
        const fromTs = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : -Infinity;
        const toTs = customTo ? new Date(`${customTo}T23:59:59.999`).getTime() : Infinity;
        return ts >= fromTs && ts <= toTs;
      }
      return true;
    });
  }, [orders, datePreset, customFrom, customTo]);

  const kpis = useMemo(() => {
    const totalOrders = dateFilteredOrders.length;
    const deliveredOrders = dateFilteredOrders.filter((o) => o.status === 'Delivered');
    const cancelledOrders = dateFilteredOrders.filter((o) => o.status === 'Cancelled');
    const activeOrders = dateFilteredOrders.filter(
      (o) => o.status !== 'Cancelled' && o.status !== 'Returned'
    );
    const totalRevenue = activeOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalDeliveryCharges = activeOrders.reduce(
      (s, o) => s + (o.courierCharges > 0 ? o.courierCharges : o.shippingFee),
      0
    );
    const totalGst = activeOrders.reduce((s, o) => s + (o.gstAmount || 0), 0);
    const pendingPayments = activeOrders
      .filter((o) => o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Verification Pending')
      .reduce((s, o) => s + o.totalAmount, 0);
    const pendingPaymentsCount = activeOrders.filter(
      (o) => o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Verification Pending'
    ).length;
    const successfulPayments = dateFilteredOrders
      .filter((o) => o.paymentStatus === 'Verified Paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const successfulPaymentsCount = dateFilteredOrders.filter(
      (o) => o.paymentStatus === 'Verified Paid'
    ).length;

    return {
      totalOrders,
      totalDelivered: deliveredOrders.length,
      totalCancelled: cancelledOrders.length,
      totalRevenue,
      totalDeliveryCharges,
      totalGst,
      pendingPayments,
      pendingPaymentsCount,
      successfulPayments,
      successfulPaymentsCount,
    };
  }, [dateFilteredOrders]);

  // Live alerts for notification bell
  const alerts = useMemo(() => {
    const pendingOrdersCount = orders.filter((o) =>
      ['Pending', 'Pending Confirmation', 'Payment Verification Pending'].includes(o.status)
    ).length;
    const pendingUpiCount = orders.filter(
      (o) => o.paymentStatus === 'Verification Pending'
    ).length;
    const lowStockSkus = products.reduce(
      (sum, p) => sum + p.variants.filter((v) => v.stock < 10).length,
      0
    );
    const openTicketsCount = messages.filter((m) => !m.readStatus || m.status === 'Open').length;

    const list: Array<{
      id: string;
      title: string;
      detail: string;
      section: SidebarSection;
    }> = [];
    if (pendingUpiCount > 0) {
      list.push({
        id: 'upi',
        title: `${pendingUpiCount} UPI Payment(s) Awaiting Verification`,
        detail: 'Check UTR & screenshot proof in Payments',
        section: 'payments',
      });
    }
    if (pendingOrdersCount > 0) {
      list.push({
        id: 'orders',
        title: `${pendingOrdersCount} Pending Order(s) to Confirm`,
        detail: 'Review and confirm customer orders',
        section: 'orders',
      });
    }
    if (lowStockSkus > 0) {
      list.push({
        id: 'stock',
        title: `${lowStockSkus} SKU(s) Low or Out of Stock`,
        detail: 'Update inventory quantities',
        section: 'inventory',
      });
    }
    if (openTicketsCount > 0) {
      list.push({
        id: 'support',
        title: `${openTicketsCount} Unread Support Enquiry`,
        detail: 'Respond in Customer Support',
        section: 'support',
      });
    }
    return list;
  }, [orders, products, messages]);

  const recentPendingOrders = useMemo(
    () =>
      dateFilteredOrders.filter((o) =>
        ['Pending', 'Pending Confirmation', 'Payment Verification Pending'].includes(o.status)
      ),
    [dateFilteredOrders]
  );

  const deliveredOrdersFiltered = useMemo(() => {
    const q = deliveredSearch.trim().toLowerCase();
    return dateFilteredOrders
      .filter((o) => o.status === 'Delivered')
      .filter((o) => {
        if (deliveredPayFilter !== 'all' && o.paymentStatus !== deliveredPayFilter) return false;
        if (!q) return true;
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.trackingNumber || '').toLowerCase().includes(q) ||
          (o.deliveryPartner || o.courierName || '').toLowerCase().includes(q) ||
          o.items.some((i) => i.productName.toLowerCase().includes(q))
        );
      });
  }, [dateFilteredOrders, deliveredSearch, deliveredPayFilter]);

  const paginatedDelivered = deliveredOrdersFiltered.slice(
    (deliveredPage - 1) * 6,
    deliveredPage * 6
  );

  const allOrdersFiltered = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.mobileNumber.includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q) ||
        o.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, orderSearch]);

  const paginatedOrders = allOrdersFiltered.slice((ordersPage - 1) * 10, ordersPage * 10);

  const sidebarItems: Array<{
    id: SidebarSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      badge: recentPendingOrders.length || undefined,
    },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'courier', label: 'Courier / Delivery', icon: Truck },
    { id: 'tracking', label: 'Tracking', icon: MapPin },
    { id: 'customers', label: 'Customers', icon: Users },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      badge: orders.filter((o) => o.paymentStatus === 'Verification Pending').length || undefined,
    },
    { id: 'inventory', label: 'Inventory / Stock', icon: Boxes },
    { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw },
    {
      id: 'support',
      label: 'Customer Support',
      icon: MessageSquare,
      badge: messages.filter((m) => !m.readStatus).length || undefined,
    },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Website Settings', icon: Globe },
    { id: 'profile', label: 'Owner Profile', icon: UserCog },
  ];

  const activeTitle =
    sidebarItems.find((item) => item.id === activeSection)?.label || 'Dashboard';

  // ==================== LOADING / LOGIN SCREEN ====================
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">
        Verifying owner session...
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen py-14 px-4 sm:px-6 flex items-center justify-center bg-[#FAF8F3]">
        <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5DEC9] shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <BrandMark size="md" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-[#163024]">
              {authMode === 'setup'
                ? 'Initialize Owner Portal'
                : authMode === 'reset'
                ? 'Reset Owner Password'
                : 'OJAS Owner Portal'}
            </h1>
            <p className="text-xs text-[#525E56]">
              {authMode === 'setup'
                ? 'Configure your private website owner login email and strong password.'
                : authMode === 'reset'
                ? 'Reset access using your owner recovery key or server reset key.'
                : 'Restricted to authorized website owner only. Customer Care email is kept separate.'}
            </p>
          </div>

          {authNotice && (
            <div className="p-3 rounded-lg bg-[#F2EFE6] border border-[#B88A3B]/40 text-xs text-[#163024]">
              {authNotice}
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Private Owner Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter private owner login email"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Owner Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>

              {loginError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <Lock className="w-4 h-4 text-[#D4AF63]" />
                <span>{loggingIn ? 'Authenticating...' : 'Sign In to Owner Portal'}</span>
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginError('');
                    setAuthMode('reset');
                  }}
                  className="text-[#1B4332] hover:text-[#B88A3B] font-medium underline underline-offset-2"
                >
                  Forgot / Reset Password
                </button>
                {needsSetup && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError('');
                      setAuthMode('setup');
                    }}
                    className="text-[#B88A3B] font-medium underline underline-offset-2"
                  >
                    First-Time Setup
                  </button>
                )}
              </div>
            </form>
          )}

          {authMode === 'setup' && (
            <form onSubmit={handleSetupOwner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Owner Display Name
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Private Owner Login Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Private owner email (not customer care)"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Owner Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Owner Setup Key
                </label>
                <input
                  type="password"
                  required
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  placeholder="From OWNER_SETUP_KEY or data/.owner-recovery-key"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Personal Recovery Key (Optional)
                </label>
                <input
                  type="password"
                  value={personalRecoveryKey}
                  onChange={(e) => setPersonalRecoveryKey(e.target.value)}
                  placeholder="Min 8 characters for future password resets"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              {loginError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {loginError}
                </p>
              )}
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4 text-[#D4AF63]" />
                <span>{loggingIn ? 'Saving...' : 'Save Private Owner Credentials'}</span>
              </button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginError('');
                    setAuthMode('login');
                  }}
                  className="text-xs text-[#525E56] hover:text-[#163024] underline"
                >
                  Back to Owner Sign In
                </button>
              </div>
            </form>
          )}

          {authMode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Owner Email
                </label>
                <input
                  type="email"
                  required
                  value={resetCurrentEmail}
                  onChange={(e) => setResetCurrentEmail(e.target.value)}
                  placeholder="Current private owner email"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  New Owner Email (Optional)
                </label>
                <input
                  type="email"
                  value={resetNewEmail}
                  onChange={(e) => setResetNewEmail(e.target.value)}
                  placeholder="Leave blank to keep existing owner email"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Recovery Key / Reset Key
                </label>
                <input
                  type="password"
                  required
                  value={resetRecoveryKey}
                  onChange={(e) => setResetRecoveryKey(e.target.value)}
                  placeholder="Your personal key or data/.owner-recovery-key"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  New Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Choose a new strong password"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                />
              </div>
              {loginError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {loginError}
                </p>
              )}
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4 text-[#D4AF63]" />
                <span>{loggingIn ? 'Resetting...' : 'Reset Owner Password'}</span>
              </button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginError('');
                    setAuthMode('login');
                  }}
                  className="text-xs text-[#525E56] hover:text-[#163024] underline"
                >
                  Back to Owner Sign In
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2 border-t border-[#E5DEC9]">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-xs text-[#525E56] hover:text-[#163024] underline"
            >
              Return to OJAS Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== AUTHENTICATED OWNER ADMIN DASHBOARD ====================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="no-print fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
        />
      )}

      {/* Left Sidebar Navigation (15 Exact Items) */}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveSection('dashboard');
              setMobileNavOpen(false);
            }}
            className="flex items-center gap-2.5 text-left"
          >
            <BrandMark size="sm" />
            <div>
              <p className="font-serif text-lg font-bold tracking-wide text-[#163024] leading-none">
                OJAS
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B88A3B] mt-0.5">
                Owner Admin
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#163024] text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-[#163024]'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#D4AF63]' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                      active
                        ? 'bg-[#D4AF63] text-[#163024]'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navigation Bar */}
        <header className="no-print sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-[#163024]">OJAS Portal</span>
                <span>/</span>
                <span className="truncate font-medium text-slate-700">{activeTitle}</span>
              </div>
              <h1 className="font-serif text-lg sm:text-xl font-semibold text-[#163024] truncate leading-tight">
                {activeTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#1B4332]" />
              <span>Storefront</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileMenuOpen(false);
                }}
                aria-label="Notifications"
                className="relative p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B88A3B] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {alerts.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#163024]">
                      Actionable Alerts ({alerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">
                        All orders, payments, stock, and support tickets are up to date.
                      </p>
                    ) : (
                      alerts.map((alert) => (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => {
                            setActiveSection(alert.section);
                            setNotifOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-xs font-semibold text-[#163024]">{alert.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{alert.detail}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Owner Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
              >
                <div className="w-7 h-7 rounded-md bg-[#163024] text-[#D4AF63] flex items-center justify-center text-xs font-bold">
                  {(adminUser.name || 'O').charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-900 leading-none">
                    {adminUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[140px]">
                    {adminUser.email}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl z-40 py-1.5 text-xs">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="font-semibold text-[#163024]">{adminUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{adminUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('profile');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700"
                  >
                    Owner Profile &amp; Security
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('settings');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700"
                  >
                    Website Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onNavigate('/');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700"
                  >
                    Open Live Storefront
                  </button>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-700 font-semibold"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {toast && (
            <div className="no-print fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#163024] text-white border border-[#B88A3B] text-xs sm:text-sm shadow-lg">
              {toast}
            </div>
          )}

          {/* ==================== 1. DASHBOARD OVERVIEW ==================== */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Date Range Bar */}
              <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#163024]">
                  <Calendar className="w-4 h-4 text-[#B88A3B]" />
                  <span>Filter Period: {dateLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: '90d', label: 'Last 90 Days' },
                    { id: 'all', label: 'All Time' },
                    { id: 'custom', label: 'Custom Date Range' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDatePreset(p.id as DateRangePreset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        datePreset === p.id
                          ? 'bg-[#163024] text-white border-[#163024]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}

                  {datePreset === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2 ml-1">
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="px-2.5 py-1 rounded border border-slate-300 text-xs"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="px-2.5 py-1 rounded border border-slate-300 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 8 Clickable Live Database Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Orders',
                    value: String(kpis.totalOrders),
                    sub: `${dateLabel}`,
                    tone: 'text-[#163024]',
                    onClick: () => {
                      setStatusFilter('All');
                      setActiveSection('orders');
                    },
                  },
                  {
                    label: 'Total Delivered',
                    value: String(kpis.totalDelivered),
                    sub: 'Completed fulfillments',
                    tone: 'text-emerald-700',
                    onClick: () => {
                      setStatusFilter('Delivered');
                      setActiveSection('orders');
                    },
                  },
                  {
                    label: 'Total Cancelled',
                    value: String(kpis.totalCancelled),
                    sub: 'Cancelled orders',
                    tone: 'text-red-700',
                    onClick: () => {
                      setStatusFilter('Cancelled');
                      setActiveSection('orders');
                    },
                  },
                  {
                    label: 'Total Revenue',
                    value: formatINR(kpis.totalRevenue),
                    sub: 'Active order value',
                    tone: 'text-[#163024]',
                    onClick: () => setActiveSection('reports'),
                  },
                  {
                    label: 'Total Delivery Charges',
                    value: formatINR(kpis.totalDeliveryCharges),
                    sub: 'Courier / Shipping total',
                    tone: 'text-slate-900',
                    onClick: () => setActiveSection('courier'),
                  },
                  {
                    label: 'Total GST',
                    value: formatINR(kpis.totalGst),
                    sub: `Inclusive @ ${content?.gstPercent ?? 5}%`,
                    tone: 'text-[#163024]',
                    onClick: () => setActiveSection('reports'),
                  },
                  {
                    label: 'Pending Payments',
                    value: formatINR(kpis.pendingPayments),
                    sub: `${kpis.pendingPaymentsCount} unpaid / verifying`,
                    tone: 'text-amber-700',
                    onClick: () => setActiveSection('payments'),
                  },
                  {
                    label: 'Successful Payments',
                    value: formatINR(kpis.successfulPayments),
                    sub: `${kpis.successfulPaymentsCount} verified paid`,
                    tone: 'text-emerald-700',
                    onClick: () => setActiveSection('payments'),
                  },
                ].map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={card.onClick}
                    className="text-left rounded-xl bg-white border border-slate-200 hover:border-[#163024] p-4 sm:p-5 transition-colors group"
                  >
                    <p className="text-xs font-medium text-slate-500 group-hover:text-[#163024]">
                      {card.label}
                    </p>
                    <p className={`text-xl sm:text-2xl font-bold mt-1.5 tabular-nums ${card.tone}`}>
                      {card.value}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 tabular-nums">{card.sub}</p>
                  </button>
                ))}
              </div>

              {/* 6 Interactive Graphs */}
              <AdminCharts orders={dateFilteredOrders} dateLabel={dateLabel} />

              {/* Recent Pending Orders Table */}
              <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#163024]">
                      Recent Pending Orders ({recentPendingOrders.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Orders awaiting owner confirmation or UPI payment review
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('Pending Confirmation');
                      setActiveSection('orders');
                    }}
                    className="text-xs font-semibold text-[#1B4332] hover:text-[#B88A3B] underline"
                  >
                    Manage All Orders
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[920px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Order ID</th>
                        <th className="p-3.5">Customer Name</th>
                        <th className="p-3.5">Mobile Number</th>
                        <th className="p-3.5">Product Name</th>
                        <th className="p-3.5">Quantity</th>
                        <th className="p-3.5">Order Amount</th>
                        <th className="p-3.5">Payment Method</th>
                        <th className="p-3.5">Order Date</th>
                        <th className="p-3.5">Order Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {recentPendingOrders.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-500">
                            No pending orders in {dateLabel}.
                          </td>
                        </tr>
                      ) : (
                        recentPendingOrders.slice(0, 8).map((o) => {
                          const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
                          const primaryProd =
                            o.items.length === 1
                              ? o.items[0].productName
                              : `${o.items[0]?.productName || 'Item'} +${o.items.length - 1}`;
                          return (
                            <tr key={o.id} className="hover:bg-slate-50/70">
                              <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                                {o.orderNumber}
                              </td>
                              <td className="p-3.5 font-medium text-slate-900">{o.customerName}</td>
                              <td className="p-3.5 text-slate-600 tabular-nums">{o.mobileNumber}</td>
                              <td className="p-3.5 text-slate-800">{primaryProd}</td>
                              <td className="p-3.5 tabular-nums">{totalQty}</td>
                              <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                                {formatINR(o.totalAmount)}
                              </td>
                              <td className="p-3.5 text-slate-600">{o.paymentMethod}</td>
                              <td className="p-3.5 text-slate-600 tabular-nums">
                                {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${getStatusPillClass(
                                    o.status
                                  )}`}
                                >
                                  {o.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalOrder(o);
                                    setModalMode('manage');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#163024] text-white font-semibold hover:bg-[#1B4332]"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Recent Delivered Orders Table (Search, Filters, Pagination, CSV) */}
              <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#163024]">
                      Recent Delivered Orders ({deliveredOrdersFiltered.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Completed fulfillments with delivery partner, tracking ID, and payment state
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={deliveredSearch}
                        onChange={(e) => {
                          setDeliveredSearch(e.target.value);
                          setDeliveredPage(1);
                        }}
                        placeholder="Search delivered..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-44"
                      />
                    </div>
                    <select
                      value={deliveredPayFilter}
                      onChange={(e) => {
                        setDeliveredPayFilter(e.target.value as any);
                        setDeliveredPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    >
                      <option value="all">All Payment Statuses</option>
                      <option value="Verified Paid">Verified Paid</option>
                      <option value="Unpaid">Unpaid / COD Pending</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        downloadOrdersCsv(
                          `ojas-delivered-orders-${new Date().toISOString().slice(0, 10)}.csv`,
                          deliveredOrdersFiltered
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[860px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Order ID</th>
                        <th className="p-3.5">Customer Name</th>
                        <th className="p-3.5">Product</th>
                        <th className="p-3.5">Delivery Partner</th>
                        <th className="p-3.5">Tracking ID</th>
                        <th className="p-3.5">Delivery Date</th>
                        <th className="p-3.5">Total Amount</th>
                        <th className="p-3.5">Payment Status</th>
                        <th className="p-3.5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedDelivered.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500">
                            No delivered orders match your filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedDelivered.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/70">
                            <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                              {o.orderNumber}
                            </td>
                            <td className="p-3.5 font-medium text-slate-900">{o.customerName}</td>
                            <td className="p-3.5 text-slate-700">
                              {o.items.map((i) => i.productName).join(', ')}
                            </td>
                            <td className="p-3.5 text-slate-700">
                              {o.deliveryPartner || o.courierName || 'Studio Direct'}
                            </td>
                            <td className="p-3.5 font-mono text-slate-600">
                              {o.trackingNumber || '—'}
                            </td>
                            <td className="p-3.5 text-slate-600 tabular-nums">
                              {new Date(o.deliveredAt || o.updatedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                              {formatINR(o.totalAmount)}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded font-semibold ${
                                  o.paymentStatus === 'Verified Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalOrder(o);
                                  setModalMode('invoice');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Invoice</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {deliveredOrdersFiltered.length > 6 && (
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span className="tabular-nums">
                      Page {deliveredPage} of {Math.ceil(deliveredOrdersFiltered.length / 6)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={deliveredPage <= 1}
                        onClick={() => setDeliveredPage((p) => p - 1)}
                        className="p-1.5 rounded border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deliveredPage >= Math.ceil(deliveredOrdersFiltered.length / 6)}
                        onClick={() => setDeliveredPage((p) => p + 1)}
                        className="p-1.5 rounded border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ==================== 2. ORDERS MANAGEMENT ==================== */}
          {activeSection === 'orders' && (
            <div className="space-y-5">
              <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {['All', ...ORDER_STATUSES].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setOrdersPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        statusFilter === st
                          ? 'bg-[#163024] text-white border-[#163024]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => {
                        setOrderSearch(e.target.value);
                        setOrdersPage(1);
                      }}
                      placeholder="Search Order ID, name, mobile..."
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-56"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadOrdersCsv(
                        `ojas-orders-${new Date().toISOString().slice(0, 10)}.csv`,
                        allOrdersFiltered
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[980px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Order ID &amp; Date</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Items</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Order Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-500">
                          No orders match the current filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/70">
                          <td className="p-3.5">
                            <div className="font-semibold text-[#163024] tabular-nums">
                              {order.orderNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {new Date(order.createdAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-900">{order.customerName}</div>
                            <div className="text-slate-500 tabular-nums">{order.mobileNumber}</div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <div className="truncate text-slate-800">
                              {order.items
                                .map((i) => `${i.productName} ×${i.quantity}`)
                                .join(', ')}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {order.city} – {order.pincode}
                            </div>
                          </td>
                          <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                            {formatINR(order.totalAmount)}
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800">{order.paymentMethod}</div>
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                order.paymentStatus === 'Verified Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.paymentStatus === 'Verification Pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.paymentStatus === 'Payment Rejected' ||
                                    order.paymentStatus === 'Refunded'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleOrderStatusChange(order.id, e.target.value as OrderStatus)
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#163024]"
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setModalOrder(order);
                                setModalMode('manage');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#163024] text-white font-semibold hover:bg-[#1B4332]"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setModalOrder(order);
                                setModalMode('invoice');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Invoice</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {allOrdersFiltered.length > 10 && (
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span className="tabular-nums">
                      Showing {paginatedOrders.length} of {allOrdersFiltered.length} orders · Page{' '}
                      {ordersPage} of {Math.ceil(allOrdersFiltered.length / 10)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={ordersPage <= 1}
                        onClick={() => setOrdersPage((p) => p - 1)}
                        className="p-1.5 rounded border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={ordersPage >= Math.ceil(allOrdersFiltered.length / 10)}
                        onClick={() => setOrdersPage((p) => p + 1)}
                        className="p-1.5 rounded border border-slate-300 disabled:opacity-40"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 3. PRODUCTS MANAGEMENT ==================== */}
          {activeSection === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#163024]">
                    Products, Variants &amp; Discounts ({products.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Changes are stored permanently in SQLite and published immediately to the storefront.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewProductForm}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#163024] text-white hover:bg-[#1B4332] text-xs font-semibold"
                >
                  <Plus className="w-4 h-4 text-[#D4AF63]" />
                  <span>Add New Product</span>
                </button>
              </div>

              {editingProduct && (
                <form
                  onSubmit={handleSaveProduct}
                  className="p-6 rounded-xl bg-white border border-[#163024] space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h3 className="font-serif text-xl font-semibold text-[#163024]">
                      {isCreatingProduct ? 'Create New Product' : `Edit ${editingProduct.name}`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setIsCreatingProduct(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 underline"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, name: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Category *
                      </label>
                      <select
                        value={editingProduct.category}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, category: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                        {!categories.some((c) => c.name === editingProduct.category) && (
                          <option value={editingProduct.category}>{editingProduct.category}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={editingProduct.subtitle}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, subtitle: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editingProduct.description}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, description: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  {/* Variants */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Variants, Selling Price, MRP &amp; Stock
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            variants: [
                              ...editingProduct.variants,
                              {
                                id: `v-${Date.now()}`,
                                label: '250g Pack',
                                price: 499,
                                stock: 15,
                                sku: `OJAS-${Date.now().toString().slice(-4)}`,
                              },
                            ],
                          })
                        }
                        className="text-xs font-semibold text-[#1B4332] hover:text-[#B88A3B] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Variant
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {editingProduct.variants.map((variant, idx) => (
                        <div
                          key={variant.id}
                          className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 items-end"
                        >
                          <div className="col-span-2 sm:col-span-2">
                            <label className="text-[11px] text-slate-500 block mb-1">Label</label>
                            <input
                              type="text"
                              required
                              value={variant.label}
                              onChange={(e) => {
                                const next = [...editingProduct.variants];
                                next[idx] = { ...variant, label: e.target.value };
                                setEditingProduct({ ...editingProduct, variants: next });
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">Price (₹)</label>
                            <input
                              type="number"
                              min={0}
                              required
                              value={variant.price}
                              onChange={(e) => {
                                const price = Number(e.target.value);
                                const next = [...editingProduct.variants];
                                next[idx] = {
                                  ...variant,
                                  price,
                                  discountPercent:
                                    variant.compareAtPrice && variant.compareAtPrice > price
                                      ? Math.round(
                                          ((variant.compareAtPrice - price) /
                                            variant.compareAtPrice) *
                                            100
                                        )
                                      : undefined,
                                };
                                setEditingProduct({ ...editingProduct, variants: next });
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">MRP (₹)</label>
                            <input
                              type="number"
                              min={0}
                              value={variant.compareAtPrice || ''}
                              onChange={(e) => {
                                const mrp = Number(e.target.value) || undefined;
                                const next = [...editingProduct.variants];
                                next[idx] = {
                                  ...variant,
                                  compareAtPrice: mrp,
                                  discountPercent:
                                    mrp && mrp > variant.price
                                      ? Math.round(((mrp - variant.price) / mrp) * 100)
                                      : undefined,
                                };
                                setEditingProduct({ ...editingProduct, variants: next });
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">Stock</label>
                            <input
                              type="number"
                              min={0}
                              required
                              value={variant.stock}
                              onChange={(e) => {
                                const next = [...editingProduct.variants];
                                next[idx] = { ...variant, stock: Number(e.target.value) };
                                setEditingProduct({ ...editingProduct, variants: next });
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs tabular-nums"
                            />
                          </div>
                          <div className="flex justify-end">
                            {editingProduct.variants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = editingProduct.variants.filter((_, i) => i !== idx);
                                  setEditingProduct({ ...editingProduct, variants: next });
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Product Photos
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {editingProduct.images.map((img, i) => (
                        <div
                          key={i}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group"
                        >
                          <SafeImage
                            src={img}
                            alt="Product"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditingProduct({
                                ...editingProduct,
                                images: editingProduct.images.filter((_, idx) => idx !== i),
                              })
                            }
                            className="absolute top-1 right-1 p-1 rounded bg-white/90 text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#B88A3B] flex flex-col items-center justify-center gap-1 cursor-pointer text-xs text-slate-500">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingImage ? '...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await handleImageUpload(file);
                            if (url) {
                              setEditingProduct({
                                ...editingProduct,
                                images: [...editingProduct.images, url],
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingProduct.active}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, active: e.target.checked })
                        }
                      />
                      <span>Published on Storefront</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={editingProduct.featured}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, featured: e.target.checked })
                        }
                      />
                      <span>Featured on Home Page</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="px-5 py-2.5 rounded-lg bg-[#163024] text-white hover:bg-[#1B4332] text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <Check className="w-4 h-4 text-[#D4AF63]" />
                    <span>{savingProduct ? 'Saving...' : 'Save Product Permanently'}</span>
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-xl bg-white border border-slate-200 p-4 flex gap-4 justify-between"
                  >
                    <div className="flex gap-3.5 min-w-0">
                      <SafeImage
                        src={product.images[0]}
                        alt={product.name}
                        className="w-20 h-20 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B88A3B]">
                            {product.category}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              product.active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {product.active ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-semibold text-[#163024] truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {product.variants
                            .map(
                              (v) =>
                                `${v.label}: ${formatINR(v.price)} (${v.stock} left)`
                            )
                            .join(' · ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingProduct(false);
                          setEditingProduct(product);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 4. CATEGORIES ==================== */}
          {activeSection === 'categories' && (
            <CategoriesSection
              categories={categories}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {/* ==================== 5. COURIER / DELIVERY ==================== */}
          {activeSection === 'courier' && (
            <CourierDeliverySection
              orders={orders}
              courierApiConnected={courierApiConnected}
              onSaveCourier={handleSaveCourier}
              onOpenOrder={(o) => {
                setModalOrder(o);
                setModalMode('manage');
              }}
            />
          )}

          {/* ==================== 6. TRACKING ==================== */}
          {activeSection === 'tracking' && (
            <TrackingSection
              orders={orders}
              onUpdateStatus={handleOrderStatusChange}
              onOpenOrder={(o) => {
                setModalOrder(o);
                setModalMode('manage');
              }}
            />
          )}

          {/* ==================== 7. CUSTOMERS ==================== */}
          {activeSection === 'customers' && (
            <div className="space-y-5">
              <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#163024]">
                    Customer Directory ({customers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Search customers by name or mobile number and inspect order history
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    loadCustomers(customerSearch);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        if (!e.target.value) loadCustomers('');
                      }}
                      placeholder="Mobile or full name..."
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-56"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-[#163024] text-white text-xs font-semibold"
                  >
                    Search
                  </button>
                </form>
              </div>

              {selectedCustomerDetail && (
                <div className="rounded-xl bg-white border border-[#163024] p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[#163024]">
                        {selectedCustomerDetail.customer.name || 'OJAS Customer'}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 tabular-nums">
                        {selectedCustomerDetail.customer.mobileNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerDetail(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-semibold uppercase tracking-wider text-slate-500">
                        Saved Addresses ({selectedCustomerDetail.addresses.length})
                      </p>
                      {selectedCustomerDetail.addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <p className="font-semibold text-[#163024]">
                            {addr.label} · {addr.recipientName}
                          </p>
                          <p className="text-slate-600">
                            {addr.deliveryAddress}, {addr.city} – {addr.pincode}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold uppercase tracking-wider text-slate-500">
                        Order History ({selectedCustomerDetail.orders.length})
                      </p>
                      {selectedCustomerDetail.orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-semibold text-[#163024] tabular-nums">
                              {ord.orderNumber} · {ord.status}
                            </p>
                            <p className="text-slate-600">
                              {ord.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                            </p>
                          </div>
                          <span className="font-bold text-[#163024] tabular-nums">
                            {formatINR(ord.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[720px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Customer Name</th>
                      <th className="p-3.5">Mobile Number</th>
                      <th className="p-3.5">Orders</th>
                      <th className="p-3.5">Total Spent</th>
                      <th className="p-3.5">Joined</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5 font-semibold text-[#163024]">{c.name}</td>
                        <td className="p-3.5 text-slate-700 tabular-nums">{c.mobileNumber}</td>
                        <td className="p-3.5 tabular-nums">{c.orderCount}</td>
                        <td className="p-3.5 font-semibold text-[#163024] tabular-nums">
                          {formatINR(c.totalSpent)}
                        </td>
                        <td className="p-3.5 text-slate-500 tabular-nums">
                          {new Date(c.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            type="button"
                            disabled={loadingCustomerDetail}
                            onClick={() => loadCustomerDetail(c.id)}
                            className="px-2.5 py-1 rounded bg-[#163024] text-white font-semibold hover:bg-[#1B4332]"
                          >
                            View History
                          </button>
                          {c.mobileNumber && (
                            <a
                              href={buildWhatsAppChatUrl(c.mobileNumber, `Namaste ${c.name},`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              <MessageCircle className="w-3 h-3 text-[#1B4332]" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 8. PAYMENTS ==================== */}
          {activeSection === 'payments' && (
            <PaymentsSection
              orders={orders}
              onVerifyPayment={handleVerifyPayment}
              onOpenOrder={(o) => {
                setModalOrder(o);
                setModalMode('manage');
              }}
            />
          )}

          {/* ==================== 9. INVENTORY / STOCK ==================== */}
          {activeSection === 'inventory' && (
            <InventorySection
              products={products}
              onSaveProductStock={handleSaveProductStock}
            />
          )}

          {/* ==================== 10. RETURNS & REFUNDS ==================== */}
          {activeSection === 'returns' && (
            <ReturnsRefundsSection
              orders={orders}
              onUpdateRefund={handleUpdateRefund}
              onOpenOrder={(o) => {
                setModalOrder(o);
                setModalMode('manage');
              }}
            />
          )}

          {/* ==================== 11. CUSTOMER SUPPORT ==================== */}
          {activeSection === 'support' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#163024]">
                    Customer Support &amp; Enquiries ({messages.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage website contact submissions, track resolution status, and save reply notes.
                  </p>
                </div>
                <div className="flex gap-2">
                  {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSupportFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        supportFilter === st
                          ? 'bg-[#163024] text-white border-[#163024]'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {messages
                  .filter((m) =>
                    supportFilter === 'All' ? true : (m.status || 'Open') === supportFilter
                  )
                  .map((msg) => {
                    const currentStatus = msg.status || (msg.readStatus ? 'In Progress' : 'Open');
                    const noteVal = ticketReplyDrafts[msg.id] ?? msg.replyNote ?? '';
                    return (
                      <div
                        key={msg.id}
                        className="rounded-xl bg-white border border-slate-200 p-5 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[#163024]">
                                {msg.name}
                              </span>
                              <span className="text-xs text-slate-500 tabular-nums">
                                · {msg.mobile}
                              </span>
                              {msg.email && (
                                <span className="text-xs text-slate-500">· {msg.email}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                              {new Date(msg.createdAt).toLocaleString('en-IN')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={currentStatus}
                              onChange={(e) =>
                                handleUpdateTicket(msg.id, {
                                  status: e.target.value as SupportTicketStatus,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                            <a
                              href={buildWhatsAppChatUrl(
                                msg.mobile,
                                `Namaste ${msg.name}, regarding your OJAS enquiry: `
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#163024] text-white text-xs font-semibold"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#D4AF63]" />
                              <span>WhatsApp Reply</span>
                            </a>
                          </div>
                        </div>

                        <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-200">
                          {msg.message}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={noteVal}
                            onChange={(e) =>
                              setTicketReplyDrafts((prev) => ({
                                ...prev,
                                [msg.id]: e.target.value,
                              }))
                            }
                            placeholder="Internal studio resolution note..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTicket(msg.id, {
                                replyNote: noteVal,
                                status: currentStatus,
                              })
                            }
                            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ==================== 12. REPORTS & ANALYTICS ==================== */}
          {activeSection === 'reports' && (
            <ReportsAnalyticsSection orders={dateFilteredOrders} dateLabel={dateLabel} />
          )}

          {/* ==================== 13. WEBSITE SETTINGS ==================== */}
          {activeSection === 'settings' && content && (
            <form
              onSubmit={handleSaveContent}
              className="rounded-xl bg-white border border-slate-200 p-6 space-y-6"
            >
              <div>
                <h2 className="text-base font-semibold text-[#163024]">
                  Website Settings, Tax &amp; Studio Contact Info
                </h2>
                <p className="text-xs text-slate-500">
                  All edits persist in SQLite and update the live storefront &amp; printable invoices immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Announcement Bar
                  </label>
                  <input
                    type="text"
                    value={content.announcementBar}
                    onChange={(e) => setContent({ ...content, announcementBar: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Hero Heading
                  </label>
                  <input
                    type="text"
                    value={content.heroHeading}
                    onChange={(e) => setContent({ ...content, heroHeading: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Business Legal Name (Invoices)
                  </label>
                  <input
                    type="text"
                    value={content.businessLegalName || ''}
                    onChange={(e) => setContent({ ...content, businessLegalName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={content.gstin || ''}
                    onChange={(e) => setContent({ ...content, gstin: e.target.value })}
                    placeholder="e.g. 07XXXXX0000X1Z5"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Inclusive GST % Rate
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={28}
                    step={0.5}
                    value={content.gstPercent ?? 5}
                    onChange={(e) =>
                      setContent({ ...content, gstPercent: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Free Shipping Above (₹)
                  </label>
                  <input
                    type="number"
                    value={content.freeShippingThreshold}
                    onChange={(e) =>
                      setContent({ ...content, freeShippingThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Standard Shipping Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={content.standardShippingFee}
                    onChange={(e) =>
                      setContent({ ...content, standardShippingFee: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Care Phone
                  </label>
                  <input
                    type="text"
                    value={content.contactPhone}
                    onChange={(e) => setContent({ ...content, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Care Email
                  </label>
                  <input
                    type="email"
                    value={content.contactEmail}
                    onChange={(e) => setContent({ ...content, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Business Address
                  </label>
                  <input
                    type="text"
                    value={content.businessAddress}
                    onChange={(e) => setContent({ ...content, businessAddress: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    value={content.businessHours}
                    onChange={(e) => setContent({ ...content, businessHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingContent}
                className="px-5 py-2.5 rounded-lg bg-[#163024] text-white hover:bg-[#1B4332] text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Check className="w-4 h-4 text-[#D4AF63]" />
                <span>{savingContent ? 'Saving...' : 'Save Website Settings'}</span>
              </button>
            </form>
          )}

          {/* ==================== 14. OWNER PROFILE & SECURITY ==================== */}
          {activeSection === 'profile' && (
            <form
              onSubmit={handleSecurityUpdate}
              className="max-w-xl rounded-xl bg-white border border-slate-200 p-6 space-y-5"
            >
              <div>
                <h2 className="text-base font-semibold text-[#163024]">
                  Owner Profile &amp; Private Access Security
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Private owner login credentials remain strictly separate from Customer Care (customercareojas@gmail.com) and customer accounts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Owner Display Name
                </label>
                <input
                  type="text"
                  required
                  value={securityName}
                  onChange={(e) => setSecurityName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Private Owner Login Email
                </label>
                <input
                  type="email"
                  required
                  value={securityEmail}
                  onChange={(e) => setSecurityEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  New Password (Optional, min 8 chars)
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  New Personal Recovery Key (Optional)
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={newRecoveryKey}
                  onChange={(e) => setNewRecoveryKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              {pwError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {pwError}
                </p>
              )}
              {pwMessage && (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {pwMessage}
                </p>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#163024] text-white hover:bg-[#1B4332] text-xs font-semibold"
              >
                Save Owner Security Settings
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Order Details + Printable Tax Invoice Modal */}
      <OrderDetailInvoiceModal
        order={modalOrder}
        content={
          content || {
            heroBannerImage: '',
            heroHeading: 'OJAS',
            heroTagline: '',
            heroDescription: '',
            heroCtaLabel: '',
            announcementBar: '',
            aboutTitle: '',
            aboutLead: '',
            aboutStory: '',
            aboutStorySecondary: '',
            whyChooseTitle: '',
            whyChoosePillars: [],
            testimonials: [],
            contactPhone: '+91 9140297457',
            whatsappNumber: '919140297457',
            contactEmail: 'customercareojas@gmail.com',
            businessAddress: 'New Monday Market, Ghitorni, New Delhi – 110030.',
            businessHours: '',
            instagramUrl: '',
            facebookUrl: '',
            freeShippingThreshold: 999,
            standardShippingFee: 79,
            gstPercent: 5,
            businessLegalName: 'OJAS – Pure by Nature',
            gstin: '',
          }
        }
        initialMode={modalMode}
        onClose={() => setModalOrder(null)}
        onUpdateStatus={handleOrderStatusChange}
        onUpdateCourier={handleSaveCourier}
        onVerifyPayment={handleVerifyPayment}
        onUpdateRefund={handleUpdateRefund}
      />
    </div>
  );
};
