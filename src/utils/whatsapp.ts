import type { CartItem, Order, SiteContent } from '../types';

export const DEFAULT_WHATSAPP_NUMBER = '919140297457';

export function normalizeWhatsAppDigits(raw?: string): string {
  const digits = (raw || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
  return digits.length >= 10 ? digits : DEFAULT_WHATSAPP_NUMBER;
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Generates a cross-platform WhatsApp link compatible with Android, iPhone, and Desktop.
 */
export function buildWhatsAppChatUrl(phone: string | undefined, message: string): string {
  const digits = normalizeWhatsAppDigits(phone);
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
}

/**
 * Generates a Google Maps search link for the OJAS business address.
 */
export function buildGoogleMapsUrl(address: string): string {
  const query = address
    ? `OJAS - Pure by Nature, ${address}`
    : 'New Monday Market, Ghitorni, New Delhi 110030';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface WhatsAppCustomerDetails {
  customerName?: string;
  mobileNumber?: string;
  deliveryAddress?: string;
  city?: string;
  pincode?: string;
  notes?: string;
}

export function buildSingleProductWhatsAppMessage(params: {
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  content: SiteContent;
  customer?: WhatsAppCustomerDetails;
  orderNumber?: string;
}): string {
  const { productName, variantLabel, quantity, unitPrice, content, customer, orderNumber } = params;
  const subtotal = unitPrice * quantity;
  const shippingFee =
    subtotal >= content.freeShippingThreshold ? 0 : content.standardShippingFee;
  const total = subtotal + shippingFee;

  const lines: string[] = [
    'Namaste Ojas Customer Care,',
    'I would like to place an order on WhatsApp (subject to team confirmation):',
    '',
  ];

  if (orderNumber) {
    lines.push(`*Order Request ID:* ${orderNumber}`);
  }

  lines.push(
    `*Product:* ${productName}`,
    `*Edition / Net Weight:* ${variantLabel}`,
    `*Quantity:* ${quantity}`,
    `*Unit Price:* ${formatINR(unitPrice)}`,
    `*Subtotal:* ${formatINR(subtotal)}`,
    `*Shipping:* ${shippingFee === 0 ? 'Complimentary' : formatINR(shippingFee)}`,
    `*Estimated Total:* ${formatINR(total)}`
  );

  if (customer && (customer.customerName || customer.mobileNumber || customer.deliveryAddress)) {
    lines.push('', '*Customer Details:*');
    if (customer.customerName?.trim()) lines.push(`Name: ${customer.customerName.trim()}`);
    if (customer.mobileNumber?.trim()) lines.push(`Mobile: ${customer.mobileNumber.trim()}`);
    const addressParts = [
      customer.deliveryAddress?.trim(),
      customer.city?.trim(),
      customer.pincode?.trim() ? `PIN ${customer.pincode.trim()}` : '',
    ].filter(Boolean);
    if (addressParts.length > 0) lines.push(`Address: ${addressParts.join(', ')}`);
    if (customer.notes?.trim()) lines.push(`Note: ${customer.notes.trim()}`);
  } else {
    lines.push(
      '',
      '*Customer Details:*',
      'Name: (Please fill)',
      'Mobile: (Please fill)',
      'Delivery Address & PIN: (Please fill)'
    );
  }

  lines.push('', 'Please confirm product availability and final dispatch details.');
  return lines.join('\n');
}

export function buildCartWhatsAppMessage(params: {
  items: CartItem[];
  content: SiteContent;
  customer?: WhatsAppCustomerDetails;
  order?: Order;
}): string {
  const { items, content, customer, order } = params;

  if (order) {
    const lines: string[] = [
      'Namaste Ojas Customer Care,',
      'I have submitted an order request on your website and am sharing it here for confirmation:',
      '',
      `*Order Request ID:* ${order.orderNumber}`,
      `*Status:* ${order.status} (Awaiting Customer Care Confirmation)`,
      '',
      '*Items Ordered:*',
      ...order.items.map(
        (i, idx) =>
          `${idx + 1}. ${i.productName} (${i.variantLabel}) — Qty: ${i.quantity} × ${formatINR(
            i.price
          )} = ${formatINR(i.price * i.quantity)}`
      ),
      '',
      `*Subtotal:* ${formatINR(order.subtotal)}`,
      `*Shipping:* ${order.shippingFee === 0 ? 'Complimentary' : formatINR(order.shippingFee)}`,
      `*Total Payable:* ${formatINR(order.totalAmount)}`,
      `*Payment Preference:* ${order.paymentMethod}`,
      '',
      '*Customer Details:*',
      `Name: ${order.customerName}`,
      `Mobile: ${order.mobileNumber}`,
      `Address: ${order.deliveryAddress}, ${order.city} - ${order.pincode}`,
    ];
    if (order.notes) lines.push(`Note: ${order.notes}`);
    lines.push('', 'Please confirm this order before dispatch. Thank you!');
    return lines.join('\n');
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee =
    items.length === 0
      ? 0
      : subtotal >= content.freeShippingThreshold
      ? 0
      : content.standardShippingFee;
  const total = subtotal + shippingFee;

  const lines: string[] = [
    'Namaste Ojas Customer Care,',
    'I would like to place the following order via WhatsApp (awaiting team confirmation):',
    '',
    '*Items in Bag:*',
    ...items.map(
      (i, idx) =>
        `${idx + 1}. ${i.productName} (${i.variantLabel}) — Qty: ${i.quantity} × ${formatINR(
          i.price
        )} = ${formatINR(i.price * i.quantity)}`
    ),
    '',
    `*Subtotal:* ${formatINR(subtotal)}`,
    `*Shipping:* ${shippingFee === 0 ? 'Complimentary' : formatINR(shippingFee)}`,
    `*Estimated Total:* ${formatINR(total)}`,
  ];

  if (customer && (customer.customerName || customer.mobileNumber || customer.deliveryAddress)) {
    lines.push('', '*Customer Details:*');
    if (customer.customerName?.trim()) lines.push(`Name: ${customer.customerName.trim()}`);
    if (customer.mobileNumber?.trim()) lines.push(`Mobile: ${customer.mobileNumber.trim()}`);
    const addressParts = [
      customer.deliveryAddress?.trim(),
      customer.city?.trim(),
      customer.pincode?.trim() ? `PIN ${customer.pincode.trim()}` : '',
    ].filter(Boolean);
    if (addressParts.length > 0) lines.push(`Address: ${addressParts.join(', ')}`);
    if (customer.notes?.trim()) lines.push(`Note: ${customer.notes.trim()}`);
  } else {
    lines.push(
      '',
      '*Customer Details:*',
      'Name: (Please enter your name)',
      'Mobile: (Please enter your mobile)',
      'Delivery Address & PIN: (Please enter your address)'
    );
  }

  lines.push('', 'Kindly confirm availability and delivery details. Thank you!');
  return lines.join('\n');
}
