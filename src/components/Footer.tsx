import React from 'react';
import { MessageCircle, Phone, Mail, MapPin, ArrowUpRight, Lock } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { buildGoogleMapsUrl, buildWhatsAppChatUrl } from '../utils/whatsapp';
import type { SiteContent } from '../types';

interface FooterProps {
  content: SiteContent;
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ content, onNavigate }) => {
  const whatsappHref = buildWhatsAppChatUrl(
    content.whatsappNumber,
    'Namaste Ojas Customer Care, I would like to enquire about your natural products.'
  );

  return (
    <footer className="bg-[#163024] text-[#FAF8F3] border-t border-[#264A38]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand Signature */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <BrandMark size="md" tone="light" />
              <div>
                <p className="font-serif text-2xl font-semibold tracking-[0.12em] text-[#FAF8F3]">
                  OJAS – Pure by Nature
                </p>
                <p className="text-sm text-[#D4AF63] font-medium mt-0.5">
                  Natural Products, Better Life.
                </p>
              </div>
            </div>
            <p className="text-sm text-[#D6DDD8] leading-relaxed max-w-sm">
              Crafted in small batches in India with pure natural materials, transparent care, and
              thoughtful reusable packaging for everyday living.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#B88A3B] text-[#163024] hover:bg-[#D4AF63] transition-colors text-sm font-semibold whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Enquiry</span>
              </a>
              {content.instagramUrl && (
                <a
                  href={content.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[#D6DDD8] hover:text-[#D4AF63] transition-colors"
                >
                  <span>Instagram</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
              {content.facebookUrl && (
                <a
                  href={content.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[#D6DDD8] hover:text-[#D4AF63] transition-colors"
                >
                  <span>Facebook</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Storefront & Company Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-[#D4AF63]">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D6DDD8]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="hover:text-[#FAF8F3] transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/products')}
                  className="hover:text-[#FAF8F3] transition-colors"
                >
                  Our Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/about')}
                  className="hover:text-[#FAF8F3] transition-colors"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/contact')}
                  className="hover:text-[#FAF8F3] transition-colors"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-[#D4AF63]">
              Customer Care & Policies
            </h4>
            <ul className="space-y-2.5 text-sm text-[#D6DDD8]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/account')}
                  className="hover:text-[#FAF8F3] transition-colors text-left"
                >
                  My Account &amp; Track Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/payment')}
                  className="hover:text-[#FAF8F3] transition-colors text-left"
                >
                  UPI Payment Details
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/shipping-policy')}
                  className="hover:text-[#FAF8F3] transition-colors text-left"
                >
                  Shipping and Return Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/privacy-policy')}
                  className="hover:text-[#FAF8F3] transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/terms')}
                  className="hover:text-[#FAF8F3] transition-colors text-left"
                >
                  Terms and Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-[#D4AF63]">
              Ojas Customer Care
            </h4>
            <ul className="space-y-3 text-sm text-[#D6DDD8]">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#D4AF63] shrink-0 mt-0.5" />
                <a
                  href={`tel:${content.contactPhone.replace(/\s+/g, '')}`}
                  className="hover:text-[#FAF8F3] transition-colors tabular-nums"
                >
                  {content.contactPhone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#D4AF63] shrink-0 mt-0.5" />
                <a
                  href={`mailto:${content.contactEmail}`}
                  className="hover:text-[#FAF8F3] transition-colors break-all"
                >
                  {content.contactEmail}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D4AF63] shrink-0 mt-0.5" />
                <a
                  href={buildGoogleMapsUrl(content.businessAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leading-relaxed hover:text-[#FAF8F3] transition-colors group"
                >
                  <span className="block font-medium text-[#FAF8F3]">OJAS – Pure by Nature</span>
                  <span className="block">{content.businessAddress}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-[#D4AF63] mt-0.5 group-hover:underline">
                    <span>Open in Google Maps</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright + Discreet Owner Portal Entry */}
        <div className="mt-12 pt-6 border-t border-[#264A38] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A8B8AE]">
          <p>
            © {new Date().getFullYear()} OJAS – Pure by Nature. Natural Products, Better Life. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/admin')}
            className="inline-flex items-center gap-1.5 text-[#A8B8AE] hover:text-[#D4AF63] transition-colors"
          >
            <Lock className="w-3 h-3" />
            <span>Owner Portal</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
