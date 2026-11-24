export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  stock: number;
  sku: string;
}

export interface ProductDetails {
  highlights: string[];
  intendedUses: string[];
  materialsOrComposition: string;
  storageAndCare: string;
  craftNote: string;
  origin: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  details: ProductDetails;
  variants: ProductVariant[];
  images: string[];
  featured: boolean;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface CategoryItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
  productCount?: number;
  createdAt: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  slug: string;
  variantId: string;
  variantLabel: string;
  price: number;
  quantity: number;
  image: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Pending Confirmation'
  | 'Payment Verification Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export type PaymentStatus =
  | 'Unpaid'
  | 'Verification Pending'
  | 'Verified Paid'
  | 'Payment Rejected'
  | 'Refunded';

export type RefundStatus = 'None' | 'Requested' | 'Approved' | 'Refunded' | 'Rejected';

export interface OrderStatusHistoryItem {
  status: string;
  note: string;
  timestamp: string;
  updatedBy: string;
  source?: 'manual' | 'system' | 'customer';
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId?: number | null;
  customerName: string;
  mobileNumber: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  upiTransactionId?: string;
  upiPayerApp?: string;
  paymentProofUrl?: string;
  paymentSubmittedAt?: string;
  paymentVerifiedAt?: string;
  status: OrderStatus;
  courierName?: string;
  deliveryPartner?: string;
  trackingNumber?: string;
  courierCharges: number;
  dispatchedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  returnedAt?: string;
  refundStatus: RefundStatus;
  refundAmount: number;
  returnReason?: string;
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  customerName: string;
  location: string;
  productName: string;
  quote: string;
  rating: number;
  verifiedDate: string;
}

export interface WhyChoosePillar {
  id: string;
  number: string;
  title: string;
  description: string;
}

export interface SiteContent {
  heroBannerImage: string;
  heroHeading: string;
  heroTagline: string;
  heroDescription: string;
  heroCtaLabel: string;
  announcementBar: string;
  aboutTitle: string;
  aboutLead: string;
  aboutStory: string;
  aboutStorySecondary: string;
  whyChooseTitle: string;
  whyChoosePillars: WhyChoosePillar[];
  testimonials: Testimonial[];
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  businessAddress: string;
  businessHours: string;
  instagramUrl: string;
  facebookUrl: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  gstPercent?: number;
  businessLegalName?: string;
  gstin?: string;
}

export type SupportTicketStatus = 'Open' | 'In Progress' | 'Resolved';

export interface ContactMessage {
  id: number;
  name: string;
  mobile: string;
  email: string;
  message: string;
  readStatus: boolean;
  status?: SupportTicketStatus;
  replyNote?: string;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export interface CartItem {
  productId: number;
  slug: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  price: number;
  stock: number;
  quantity: number;
  image: string;
}

export interface CustomerUser {
  id: number;
  name: string;
  mobileNumber: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: number;
  customerId: number;
  label: string;
  recipientName: string;
  mobileNumber: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AdminCustomerSummary {
  id: number;
  mobileNumber: string;
  name: string;
  email?: string;
  addressCount: number;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}
