import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle, CheckCircle2, ArrowRight, ArrowUpRight } from 'lucide-react';
import { BrandMark, SafeImage } from './BrandMark';
import { UpiPayment } from './UpiPayment';
import { buildGoogleMapsUrl, buildWhatsAppChatUrl } from '../utils/whatsapp';
import type { SiteContent } from '../types';

interface InfoPageProps {
  content: SiteContent;
  onNavigate: (path: string) => void;
}

export const AboutPage: React.FC<InfoPageProps> = ({ content, onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <div className="flex items-center gap-3">
            <BrandMark size="md" tone="dark" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
              About OJAS
            </span>
          </div>
          <h1
            className="font-serif text-4xl sm:text-5xl font-semibold text-[#163024] leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {content.aboutTitle}
          </h1>
          <p className="font-serif text-xl text-[#1B4332] leading-relaxed">
            {content.aboutLead}
          </p>
          <p className="text-base text-[#525E56] leading-relaxed">{content.aboutStory}</p>
          <p className="text-base text-[#525E56] leading-relaxed">
            {content.aboutStorySecondary}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/products')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold"
            >
              <span>Shop Our Products</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF63]" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#E5DEC9] bg-[#F2EFE6]">
            <SafeImage
              src={content.heroBannerImage}
              alt="OJAS studio craftsmanship"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="pt-12 border-t border-[#E5DEC9]">
        <h2 className="font-serif text-3xl font-semibold text-[#163024] mb-8">
          {content.whyChooseTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.whyChoosePillars.map((p) => (
            <div
              key={p.id}
              className="p-6 rounded-xl bg-white border border-[#E5DEC9] space-y-2.5"
            >
              <span className="font-serif text-2xl font-semibold text-[#B88A3B] tabular-nums block">
                {p.number}.
              </span>
              <h3 className="font-serif text-xl font-semibold text-[#163024]">{p.title}</h3>
              <p className="text-sm text-[#525E56] leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC<InfoPageProps> = ({ content }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');
      setSent(true);
      setName('');
      setMobile('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err?.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const whatsappHref = buildWhatsAppChatUrl(
    content.whatsappNumber,
    'Namaste Ojas Customer Care, I have an enquiry.'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="max-w-2xl mb-10 space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
          Contact Us
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#163024]">
          We Would Love to Hear from You
        </h1>
        <p className="text-base text-[#525E56]">
          Reach out for bulk gifting enquiries, product questions, or order assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-2xl bg-white border border-[#E5DEC9] space-y-5">
            <div className="pb-3 border-b border-[#E5DEC9]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B88A3B]">
                Customer Care Desk
              </p>
              <p className="font-serif text-xl font-semibold text-[#163024] mt-0.5">
                Ojas Customer Care
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                  WhatsApp / Phone
                </p>
                <a
                  href={`tel:${content.contactPhone.replace(/\s+/g, '')}`}
                  className="text-base font-medium text-[#163024] tabular-nums"
                >
                  {content.contactPhone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                  Email
                </p>
                <a
                  href={`mailto:${content.contactEmail}`}
                  className="text-base font-medium text-[#163024] break-all"
                >
                  {content.contactEmail}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                  Business Address
                </p>
                <a
                  href={buildGoogleMapsUrl(content.businessAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#1C241F] leading-relaxed hover:text-[#1B4332] transition-colors block mt-0.5 group"
                >
                  <span className="block font-semibold text-[#163024]">OJAS – Pure by Nature</span>
                  <span className="block">{content.businessAddress}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B88A3B] mt-1 group-hover:underline">
                    <span>View on Google Maps</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                  Hours
                </p>
                <p className="text-sm text-[#1C241F]">{content.businessHours}</p>
              </div>
            </div>
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold"
          >
            <MessageCircle className="w-4 h-4 text-[#D4AF63]" />
            <span>Chat Directly on WhatsApp</span>
          </a>
        </div>

        <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white border border-[#E5DEC9]">
          {sent ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#1B4332] mx-auto" />
              <h2 className="font-serif text-2xl font-semibold text-[#163024]">
                Message Received
              </h2>
              <p className="text-sm text-[#525E56] max-w-md mx-auto">
                Thank you for writing to OJAS. Our team will respond on your mobile number or email shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-2 px-5 py-2.5 rounded-lg border border-[#E5DEC9] text-sm font-medium text-[#163024] hover:bg-[#F2EFE6]"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-[#163024]">
                Send an Enquiry
              </h2>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm tabular-nums focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-1.5">
                  Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we assist you?"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-3 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Submit Enquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

interface PolicyPageProps {
  type: 'privacy' | 'terms' | 'shipping';
  content: SiteContent;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ type, content }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-8">
      {type === 'privacy' && (
        <>
          <div className="space-y-2 border-b border-[#E5DEC9] pb-6">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
              OJAS Policy
            </p>
            <h1 className="font-serif text-4xl font-semibold text-[#163024]">Privacy Policy</h1>
            <p className="text-sm text-[#525E56]">OJAS – Pure by Nature</p>
          </div>
          <div className="space-y-5 text-sm sm:text-base text-[#525E56] leading-relaxed">
            <p>
              At OJAS, we respect your privacy and collect only the details necessary to process
              your product enquiries and deliver your orders safely across India.
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#163024] pt-2">
              Information We Collect
            </h2>
            <p>
              When you place an order or submit a contact enquiry, we collect your name, mobile
              number, delivery address, city, PIN code, and any optional notes you share.
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#163024] pt-2">
              How We Use Your Information
            </h2>
            <p>
              Your details are used strictly to confirm your order via phone or WhatsApp, arrange
              courier dispatch, and respond to customer support questions. We never sell, rent, or
              share your personal contact information with third-party marketers.
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#163024] pt-2">
              Contact for Data Requests
            </h2>
            <p>
              To update or delete any order or contact details stored with us, email{' '}
              <strong className="text-[#163024]">{content.contactEmail}</strong> or message us at{' '}
              <strong className="text-[#163024]">{content.contactPhone}</strong>.
            </p>
          </div>
        </>
      )}

      {type === 'terms' && (
        <>
          <div className="space-y-2 border-b border-[#E5DEC9] pb-6">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
              OJAS Policy
            </p>
            <h1 className="font-serif text-4xl font-semibold text-[#163024]">
              Terms and Conditions
            </h1>
            <p className="text-sm text-[#525E56]">OJAS – Pure by Nature</p>
          </div>
          <div className="space-y-5 text-sm sm:text-base text-[#525E56] leading-relaxed">
            <p>
              Welcome to OJAS. By browsing this website and placing product orders, you agree to the
              following clear, straightforward terms.
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#163024] pt-2">
              Product Descriptions &amp; Natural Craft
            </h2>
            <p>
              Our natural powders and handcrafted candles are produced in small batches. Minor
              variations in natural hue, ceramic glaze, or wax finish are authentic characteristics
              of hand-finished natural goods. Product descriptions are informational only and do not
              constitute medical advice or health claims.
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#163024] pt-2">
              Pricing, Stock &amp; Order Confirmation
            </h2>
            <p>
              All prices are listed in Indian Rupees (₹). Submitting an order records your request
              in our studio system under “Pending Confirmation” status. Payment is collected via
              Cash on Delivery or verified UPI after confirmation with our team.
            </p>
          </div>
        </>
      )}

      {type === 'shipping' && (
        <>
          <div className="space-y-2 border-b border-[#E5DEC9] pb-6">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
              OJAS Policy
            </p>
            <h1 className="font-serif text-4xl font-semibold text-[#163024]">
              Shipping and Return Policy
            </h1>
            <p className="text-sm text-[#525E56]">OJAS – Pure by Nature</p>
          </div>
          <div className="space-y-5 text-sm sm:text-base text-[#525E56] leading-relaxed">
            <h2 className="font-serif text-2xl font-semibold text-[#163024]">
              Dispatch &amp; Delivery Timelines
            </h2>
            <p>
              Orders confirmed by our studio are typically packed and dispatched within 1–2 business
              days from New Monday Market, Ghitorni, New Delhi. Standard delivery across India takes
              3–7 business days depending on your PIN code.
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#163024] pt-2">
              Shipping Charges
            </h2>
            <p>
              Orders of ₹{content.freeShippingThreshold.toLocaleString('en-IN')} or above qualify for
              complimentary shipping across India. Orders below this threshold carry a flat
              protective shipping charge of ₹{content.standardShippingFee}.
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#163024] pt-2">
              Damaged Parcels &amp; Returns
            </h2>
            <p>
              If a ceramic vessel, glass jar, or sealed pouch arrives damaged in transit, please
              share a photograph via WhatsApp ({content.contactPhone}) or email ({content.contactEmail})
              within 48 hours of delivery. We will arrange a prompt replacement or refund. For
              hygiene and safety, opened consumable powders cannot be returned unless damaged or
              defective on arrival.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export const PaymentPage: React.FC<InfoPageProps> = ({ content, onNavigate }) => {
  const whatsappHref = buildWhatsAppChatUrl(
    content.whatsappNumber,
    'Namaste Ojas Customer Care, I have completed a UPI payment and would like to share the screenshot.'
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-8">
      <div className="space-y-2 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
          Secure UPI Transfer
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#163024]">
          UPI Payment Details
        </h1>
        <p className="text-base text-[#525E56]">
          Pay conveniently using any Indian UPI application to Shivram, then share your payment
          confirmation with Ojas Customer Care on WhatsApp.
        </p>
      </div>

      <UpiPayment contactPhone={content.contactPhone} />

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold"
        >
          <MessageCircle className="w-4 h-4 text-[#D4AF63]" />
          <span>Share Payment Screenshot on WhatsApp</span>
        </a>
        <button
          type="button"
          onClick={() => onNavigate('/products')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] transition-colors text-sm font-semibold text-[#163024]"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4 text-[#1B4332]" />
        </button>
      </div>
    </div>
  );
};

