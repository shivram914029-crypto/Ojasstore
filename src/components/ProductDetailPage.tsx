import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ShoppingBag,
  MessageCircle,
  Plus,
  Minus,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { SafeImage } from './BrandMark';
import { ImageLightbox } from './ImageLightbox';
import type { Product, SiteContent } from '../types';

interface ProductDetailPageProps {
  product: Product | undefined;
  content: SiteContent;
  onNavigate: (path: string) => void;
  onAddToCart: (
    product: Product,
    variantId: string,
    openDrawer?: boolean,
    quantity?: number
  ) => void;
  onOrderOnWhatsApp: (product: Product, variantId: string, quantity?: number) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  content,
  onNavigate,
  onAddToCart,
  onOrderOnWhatsApp,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (product) {
      setActiveImageIdx(0);
      setSelectedVariantId(product.variants[0]?.id || '');
      setQuantity(1);
    }
  }, [product?.id]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-[#163024]">Product Not Found</h1>
        <p className="text-sm text-[#525E56]">
          The product you requested may have been updated or moved.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/products')}
          className="px-5 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-sm font-semibold"
        >
          Back to Our Products
        </button>
      </div>
    );
  }

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const inStock = activeVariant && activeVariant.stock > 0;
  const maxQty = activeVariant ? Math.max(1, activeVariant.stock) : 1;

  const galleryItems = product.images.map((src, idx) => ({
    src,
    caption: `${product.name} — Image ${idx + 1}`,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <button
        type="button"
        onClick={() => onNavigate('/products')}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#525E56] hover:text-[#163024] transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Our Products</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Sticky Image Gallery */}
        <div className="lg:col-span-6 lg:sticky lg:top-28 space-y-4">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-[#E5DEC9] bg-[#F2EFE6] block text-left"
          >
            <SafeImage
              src={product.images[activeImageIdx] || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#163024]/85 text-[#FAF8F3] text-xs font-medium">
              <ZoomIn className="w-3.5 h-3.5 text-[#D4AF63]" />
              <span>Click to Zoom</span>
            </span>
          </button>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all bg-[#F2EFE6] ${
                    idx === activeImageIdx
                      ? 'border-[#163024]'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Contiguous Purchase Module + Details */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3 pb-6 border-b border-[#E5DEC9]">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#525E56]">
              <span className="uppercase tracking-wider font-semibold text-[#B88A3B]">
                {product.category}
              </span>
              <span aria-hidden="true">·</span>
              <span>{product.details.origin}</span>
              {activeVariant?.sku && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">SKU {activeVariant.sku}</span>
                </>
              )}
            </div>

            <h1 className="font-serif text-4xl sm:text-[44px] font-semibold text-[#163024] leading-tight">
              {product.name}
            </h1>
            <p className="text-base font-medium text-[#1B4332]">{product.subtitle}</p>
            <p className="text-sm sm:text-base text-[#525E56] leading-relaxed pt-1">
              {product.description}
            </p>
          </div>

          {/* Pricing, Net Weight & Purchase Controls */}
          <div className="p-6 rounded-2xl bg-white border border-[#E5DEC9] space-y-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="block text-xs text-[#525E56]">Price (Inclusive of Taxes)</span>
                <span className="text-3xl font-semibold text-[#163024] tabular-nums">
                  ₹{activeVariant?.price.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-semibold ${
                    inStock ? 'text-[#1B4332]' : 'text-red-700'
                  }`}
                >
                  {inStock ? `In Stock · ${activeVariant.stock} units ready` : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Net Weight Selector */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[#525E56] mb-2.5">
                Net Weight / Packaging Option
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.variants.map((variant) => {
                  const isSelected = activeVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                      className={`px-4 py-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-[#163024] bg-[#163024] text-[#FAF8F3]'
                          : 'border-[#E5DEC9] bg-[#FAF8F3] text-[#1C241F] hover:bg-[#F2EFE6]'
                      }`}
                    >
                      <span className="text-sm font-medium">{variant.label}</span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          isSelected ? 'text-[#D4AF63]' : 'text-[#163024]'
                        }`}
                      >
                        ₹{variant.price.toLocaleString('en-IN')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center border border-[#E5DEC9] rounded-lg bg-[#FAF8F3] h-12">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-full flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6] rounded-l-lg"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={!inStock || quantity >= maxQty}
                  className="w-11 h-full flex items-center justify-center text-[#163024] hover:bg-[#F2EFE6] rounded-r-lg disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={!inStock}
                onClick={() =>
                  activeVariant && onAddToCart(product, activeVariant.id, false, quantity)
                }
                className="flex-1 min-w-[140px] h-12 inline-flex items-center justify-center gap-2 px-5 rounded-lg border border-[#163024] text-[#163024] hover:bg-[#F2EFE6] transition-colors text-sm font-semibold disabled:opacity-45"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                type="button"
                disabled={!inStock}
                onClick={() =>
                  activeVariant && onAddToCart(product, activeVariant.id, true, quantity)
                }
                className="flex-1 min-w-[140px] h-12 inline-flex items-center justify-center gap-2 px-5 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-sm font-semibold disabled:opacity-45"
              >
                <span>Buy Now</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!inStock}
              onClick={() =>
                activeVariant && onOrderOnWhatsApp(product, activeVariant.id, quantity)
              }
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#F2EFE6] border border-[#E5DEC9] hover:bg-[#E5DEC9]/70 text-[#163024] transition-colors text-xs sm:text-sm font-semibold disabled:opacity-45"
            >
              <MessageCircle className="w-4 h-4 text-[#1B4332]" />
              <span>Order on WhatsApp</span>
            </button>
            <p className="text-[11px] text-[#525E56] text-center">
              WhatsApp orders are reviewed and confirmed by Ojas Customer Care ({content.contactPhone}) before dispatch.
            </p>
          </div>

          {/* Product Details & Intended Uses */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold text-[#163024]">
                Key Highlights
              </h2>
              <ul className="space-y-2">
                {product.details.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-[#525E56]">
                    <Check className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-5 border-t border-[#E5DEC9] space-y-3">
              <h2 className="font-serif text-2xl font-semibold text-[#163024]">
                Intended Uses
              </h2>
              <ul className="space-y-2.5 text-sm text-[#525E56] leading-relaxed">
                {product.details.intendedUses.map((use, idx) => (
                  <li key={idx} className="p-3.5 rounded-xl bg-white border border-[#E5DEC9]">
                    {use}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-5 border-t border-[#E5DEC9] grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1.5">
                <h3 className="font-semibold text-[#163024]">Materials &amp; Composition</h3>
                <p className="text-[#525E56] leading-relaxed">
                  {product.details.materialsOrComposition}
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-[#163024]">Storage &amp; Care</h3>
                <p className="text-[#525E56] leading-relaxed">
                  {product.details.storageAndCare}
                </p>
              </div>
            </div>

            {product.details.craftNote && (
              <div className="p-4 rounded-xl bg-[#F2EFE6] border border-[#E5DEC9] flex items-start gap-3 text-xs text-[#525E56] leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-[#B88A3B] shrink-0 mt-0.5" />
                <span>{product.details.craftNote}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ImageLightbox
        items={galleryItems}
        initialIndex={activeImageIdx}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
