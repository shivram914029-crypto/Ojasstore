import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ZoomIn,
  Star,
  ShoppingBag,
  MessageCircle,
  MapPin,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandMark, SafeImage } from './BrandMark';
import { ImageLightbox } from './ImageLightbox';
import { buildGoogleMapsUrl, buildWhatsAppChatUrl } from '../utils/whatsapp';
import type { Product, SiteContent } from '../types';

interface HomePageProps {
  products: Product[];
  content: SiteContent;
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product, variantId: string, openDrawer?: boolean) => void;
  onOrderOnWhatsApp: (product: Product, variantId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  content,
  onNavigate,
  onAddToCart,
  onOrderOnWhatsApp,
}) => {
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const featuredProducts = products.filter((p) => p.featured).slice(0, 4);

  const galleryItems = products.flatMap((p) =>
    p.images.map((src, idx) => ({
      src,
      caption: `${p.name} — ${idx === 0 ? p.subtitle : 'Craft & Packaging Detail'}`,
    }))
  );

  const getActiveVariant = (product: Product) => {
    const selectedId = selectedVariantByProduct[product.id];
    return product.variants.find((v) => v.id === selectedId) || product.variants[0];
  };

  return (
    <div>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden border-b border-[#E5DEC9] bg-[#FAF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Copy Column */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center space-y-6"
            >
              {/* Large OJAS Brand Lockup */}
              <div className="flex items-center gap-4">
                <BrandMark size="lg" tone="dark" />
                <div>
                  <span className="font-serif text-3xl sm:text-4xl font-semibold tracking-[0.18em] text-[#163024] block leading-none">
                    OJAS
                  </span>
                  <span className="text-xs font-semibold tracking-[0.22em] uppercase text-[#B88A3B] mt-1.5 block">
                    Pure by Nature
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h1
                  className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-semibold text-[#163024] leading-[1.08] tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  {content.heroHeading}
                </h1>
                <p className="font-serif italic text-xl sm:text-2xl text-[#1B4332]">
                  {content.heroTagline}
                </p>
                <p className="text-base text-[#525E56] leading-relaxed max-w-xl">
                  {content.heroDescription}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('/products')}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold whitespace-nowrap shrink-0"
                >
                  <span>{content.heroCtaLabel}</span>
                  <ArrowRight className="w-4 h-4 text-[#D4AF63]" />
                </button>
                <a
                  href="#ojas-gallery"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] text-[#163024] transition-colors text-sm font-medium whitespace-nowrap shrink-0"
                >
                  <span>View Gallery</span>
                </a>
              </div>

              <div className="pt-4 border-t border-[#E5DEC9] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#525E56]">
                <span>Small-Batch Crafted in India</span>
                <span aria-hidden="true">·</span>
                <span>Natural Materials</span>
                <span aria-hidden="true">·</span>
                <span>Direct Studio Dispatch</span>
              </div>
            </motion.div>

            {/* Right Hero Photography */}
            <motion.div
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="relative h-full min-h-[340px] sm:min-h-[440px] rounded-2xl overflow-hidden border border-[#E5DEC9] bg-[#F2EFE6]">
                <SafeImage
                  src={content.heroBannerImage}
                  alt="OJAS natural apothecary craft studio in sunlit India"
                  className="w-full h-full lg:h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#163024]/85 via-[#163024]/30 to-transparent p-6 sm:p-8 text-[#FAF8F3]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF63] font-semibold">
                    Natural Products, Better Life.
                  </p>
                  <p className="font-serif text-xl sm:text-2xl mt-1">
                    Thoughtfully crafted essentials for serene everyday living
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
              Signature Collection
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#163024] mt-1.5">
              Crafted Essentials
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/products')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#163024] hover:text-[#B88A3B] transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <span>Explore Full Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featuredProducts.map((product) => {
            const activeVariant = getActiveVariant(product);
            const inStock = activeVariant && activeVariant.stock > 0;

            return (
              <article
                key={product.id}
                className="group bg-white rounded-2xl border border-[#E5DEC9] overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
              >
                <button
                  type="button"
                  onClick={() => onNavigate(`/products/${product.slug}`)}
                  className="relative aspect-[4/3] w-full bg-[#F2EFE6] overflow-hidden text-left"
                >
                  <SafeImage
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>

                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-[#525E56]">
                      <span className="uppercase tracking-wider font-medium text-[#B88A3B]">
                        {product.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {inStock
                          ? `In Stock (${activeVariant.stock} available)`
                          : 'Currently Out of Stock'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate(`/products/${product.slug}`)}
                      className="text-left block"
                    >
                      <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#163024] group-hover:text-[#1B4332] transition-colors">
                        {product.name}
                      </h3>
                    </button>

                    <p className="text-sm text-[#525E56] leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#E5DEC9]">
                    {/* Net Weight Options */}
                    <div>
                      <span className="block text-xs font-medium text-[#525E56] mb-2">
                        Select Net Weight / Edition
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((variant) => {
                          const isSelected = activeVariant?.id === variant.id;
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() =>
                                setSelectedVariantByProduct((prev) => ({
                                  ...prev,
                                  [product.id]: variant.id,
                                }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                                isSelected
                                  ? 'bg-[#163024] text-[#FAF8F3]'
                                  : 'bg-[#F2EFE6] text-[#1C241F] hover:bg-[#E5DEC9]'
                              }`}
                            >
                              {variant.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price + Actions */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="block text-xs text-[#525E56]">Price</span>
                          <span className="text-2xl font-semibold text-[#163024] tabular-nums">
                            ₹{activeVariant?.price.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() =>
                              activeVariant && onAddToCart(product, activeVariant.id, false)
                            }
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#163024] text-[#163024] hover:bg-[#F2EFE6] transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap disabled:opacity-45"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Add to Cart</span>
                          </button>
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() =>
                              activeVariant && onAddToCart(product, activeVariant.id, true)
                            }
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap disabled:opacity-45"
                          >
                            <span>Buy Now</span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!inStock}
                        onClick={() =>
                          activeVariant && onOrderOnWhatsApp(product, activeVariant.id)
                        }
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#F2EFE6] border border-[#E5DEC9] hover:bg-[#E5DEC9]/70 text-[#163024] transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap disabled:opacity-45"
                      >
                        <MessageCircle className="w-4 h-4 text-[#1B4332]" />
                        <span>Order on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. About OJAS & Why Choose OJAS */}
      <section className="bg-[#F2EFE6] border-y border-[#E5DEC9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
                About OJAS
              </p>
              <h2
                className="font-serif text-3xl sm:text-4xl font-semibold text-[#163024] leading-tight"
                style={{ textWrap: 'balance' }}
              >
                {content.aboutTitle}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('/about')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#163024] hover:text-[#B88A3B] transition-colors pt-1"
              >
                <span>Read Our Story</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-7 space-y-4 text-base text-[#1C241F] leading-relaxed">
              <p className="font-serif text-xl sm:text-2xl text-[#163024] leading-snug">
                {content.aboutLead}
              </p>
              <p className="text-[#525E56]">{content.aboutStory}</p>
              <p className="text-[#525E56]">{content.aboutStorySecondary}</p>
            </div>
          </div>

          <div className="pt-12 border-t border-[#E5DEC9]">
            <div className="mb-8">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
                Our Promise
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#163024] mt-1">
                {content.whyChooseTitle}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.whyChoosePillars.map((pillar) => (
                <div
                  key={pillar.id}
                  className="p-6 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] space-y-3"
                >
                  <span className="font-serif text-2xl font-semibold text-[#B88A3B] tabular-nums block">
                    {pillar.number}.
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-[#163024]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[#525E56] leading-relaxed">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Product Image Gallery with Zoom Preview */}
      <section id="ojas-gallery" className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
              Product Gallery
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#163024] mt-1.5">
              Craft, Packaging &amp; Texture
            </h2>
          </div>
          <p className="text-sm text-[#525E56]">
            Select any photograph to inspect details with full-screen zoom
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {galleryItems.map((item, idx) => (
            <button
              key={`${item.src}-${idx}`}
              type="button"
              onClick={() => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#E5DEC9] bg-[#F2EFE6] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            >
              <SafeImage
                src={item.src}
                alt={item.caption || 'OJAS product photo'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#163024]/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-5 text-[#FAF8F3]">
                <span className="text-sm font-medium pr-4">{item.caption}</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3]/15 backdrop-blur-xs text-xs font-semibold shrink-0">
                  <ZoomIn className="w-3.5 h-3.5 text-[#D4AF63]" />
                  <span>Zoom</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Genuine Customer Testimonials */}
      {content.testimonials.length > 0 && (
        <section className="bg-[#163024] text-[#FAF8F3] border-t border-[#264A38]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
            <div className="mb-10">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF63]">
                Verified Experiences
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold mt-1.5">
                Voices from OJAS Homes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.testimonials.map((t) => (
                <blockquote
                  key={t.id}
                  className="p-6 sm:p-7 rounded-2xl bg-[#1E3F2F] border border-[#2C5541] flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-[#D4AF63]" aria-label={`${t.rating} out of 5 stars`}>
                      {Array.from({ length: t.rating }).map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-[#D4AF63] text-[#D4AF63]" />
                      ))}
                    </div>
                    <p className="text-sm sm:text-base text-[#FAF8F3]/95 leading-relaxed">
                      “{t.quote}”
                    </p>
                  </div>

                  <footer className="pt-4 border-t border-[#2C5541] text-xs space-y-0.5">
                    <p className="font-semibold text-[#FAF8F3] text-sm">{t.customerName}</p>
                    <p className="text-[#A8B8AE]">
                      {t.location} · {t.productName} · {t.verifiedDate}
                    </p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Customer Care & Business Address Section */}
      <section className="bg-[#FAF8F3] border-t border-[#E5DEC9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
                Ojas Customer Care &amp; Location
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#163024]">
                Visit or Reach Ojas Customer Care
              </h2>
              <p className="text-sm sm:text-base text-[#525E56] leading-relaxed">
                Questions about natural product care, bulk family gifting, or order status? Connect
                directly with Ojas Customer Care in New Delhi.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={buildWhatsAppChatUrl(
                    content.whatsappNumber,
                    'Namaste Ojas Customer Care, I have an enquiry about your products.'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4AF63]" />
                  <span>Chat on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => onNavigate('/contact')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#E5DEC9] bg-white hover:bg-[#F2EFE6] text-[#163024] transition-colors text-sm font-semibold whitespace-nowrap shrink-0"
                >
                  <span>Contact Page</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={buildGoogleMapsUrl(content.businessAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 rounded-2xl bg-white border border-[#E5DEC9] hover:border-[#1B4332] transition-colors space-y-2 group"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#B88A3B]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#1B4332]" />
                    <span>Business Address</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#525E56] group-hover:text-[#163024]" />
                </div>
                <p className="font-serif text-lg font-semibold text-[#163024]">
                  OJAS – Pure by Nature
                </p>
                <p className="text-sm text-[#525E56] leading-relaxed">{content.businessAddress}</p>
                <p className="text-xs font-semibold text-[#1B4332] pt-1 group-hover:underline">
                  Open in Google Maps
                </p>
              </a>

              <div className="p-6 rounded-2xl bg-white border border-[#E5DEC9] space-y-4">
                <div className="pb-2 border-b border-[#E5DEC9]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#B88A3B]">
                    Customer Care Support
                  </p>
                  <p className="font-serif text-lg font-semibold text-[#163024]">
                    Ojas Customer Care
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                      WhatsApp / Phone
                    </p>
                    <a
                      href={`tel:${content.contactPhone.replace(/\s+/g, '')}`}
                      className="text-sm font-semibold text-[#163024] hover:text-[#1B4332] tabular-nums"
                    >
                      {content.contactPhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                      Customer Care Email
                    </p>
                    <a
                      href={`mailto:${content.contactEmail}`}
                      className="text-sm font-semibold text-[#163024] hover:text-[#1B4332] break-all"
                    >
                      {content.contactEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#525E56]">
                      Hours
                    </p>
                    <p className="text-xs text-[#525E56]">{content.businessHours}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ImageLightbox
        items={galleryItems}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
