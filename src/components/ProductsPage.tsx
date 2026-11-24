import React, { useMemo, useState } from 'react';
import { Search, ShoppingBag, ArrowRight, MessageCircle } from 'lucide-react';
import { SafeImage } from './BrandMark';
import type { Product } from '../types';

interface ProductsPageProps {
  products: Product[];
  onNavigate: (path: string) => void;
  onAddToCart: (product: Product, variantId: string, openDrawer?: boolean) => void;
  onOrderOnWhatsApp: (product: Product, variantId: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  onNavigate,
  onAddToCart,
  onOrderOnWhatsApp,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, string>>({});

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...unique];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const catMatch = selectedCategory === 'All' || p.category === selectedCategory;
      const q = query.trim().toLowerCase();
      const textMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [products, selectedCategory, query]);

  const getActiveVariant = (product: Product) => {
    const id = selectedVariantByProduct[product.id];
    return product.variants.find((v) => v.id === id) || product.variants[0];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-10">
      <div className="space-y-3 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#B88A3B]">
          Our Products
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#163024]">
          Pure Natural Offerings
        </h1>
        <p className="text-base text-[#525E56] leading-relaxed">
          Every OJAS creation is prepared in small batches with honest ingredients, transparent net weights, and real-time studio stock availability.
        </p>
      </div>

      {/* Interactive Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DEC9]">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2EFE6] rounded-lg border border-[#E5DEC9] self-start">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-white text-[#163024] shadow-xs'
                  : 'text-[#525E56] hover:text-[#163024]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#525E56] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#1B4332]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-[#E5DEC9] text-center space-y-2">
          <p className="font-serif text-2xl text-[#163024]">No matching products found</p>
          <p className="text-sm text-[#525E56]">
            Try clearing your search filter or viewing all categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((product) => {
            const activeVariant = getActiveVariant(product);
            const inStock = activeVariant && activeVariant.stock > 0;

            return (
              <article
                key={product.id}
                className="group bg-white rounded-2xl border border-[#E5DEC9] overflow-hidden flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => onNavigate(`/products/${product.slug}`)}
                  className="aspect-[4/3] w-full bg-[#F2EFE6] overflow-hidden text-left"
                >
                  <SafeImage
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#525E56]">
                      <span className="uppercase tracking-wider font-medium text-[#B88A3B]">
                        {product.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {inStock ? `${activeVariant.stock} in stock` : 'Out of Stock'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/products/${product.slug}`)}
                      className="text-left block"
                    >
                      <h2 className="font-serif text-2xl font-semibold text-[#163024] group-hover:text-[#1B4332] transition-colors">
                        {product.name}
                      </h2>
                    </button>
                    <p className="text-sm text-[#525E56] line-clamp-3 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#E5DEC9]">
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            setSelectedVariantByProduct((prev) => ({
                              ...prev,
                              [product.id]: v.id,
                            }))
                          }
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                            activeVariant?.id === v.id
                              ? 'bg-[#163024] text-[#FAF8F3]'
                              : 'bg-[#F2EFE6] text-[#1C241F] hover:bg-[#E5DEC9]'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-semibold text-[#163024] tabular-nums">
                          ₹{activeVariant?.price.toLocaleString('en-IN')}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigate(`/products/${product.slug}`)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#E5DEC9] text-xs font-semibold text-[#163024] hover:bg-[#F2EFE6] transition-colors whitespace-nowrap"
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() =>
                              activeVariant && onAddToCart(product, activeVariant.id, false)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-xs font-semibold whitespace-nowrap disabled:opacity-45"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF63]" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!inStock}
                        onClick={() =>
                          activeVariant && onOrderOnWhatsApp(product, activeVariant.id)
                        }
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-lg bg-[#F2EFE6] border border-[#E5DEC9] hover:bg-[#E5DEC9]/70 text-[#163024] transition-colors text-xs font-semibold whitespace-nowrap disabled:opacity-45"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#1B4332]" />
                        <span>Order on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
