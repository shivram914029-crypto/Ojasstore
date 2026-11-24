import React, { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { ProductsPage } from './components/ProductsPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { AboutPage, ContactPage, PaymentPage, PolicyPage } from './components/InfoPages';
import { CartDrawer } from './components/CartDrawer';
import { WhatsAppOrderModal } from './components/WhatsAppOrderModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CustomerAuthPage, CustomerEntryModal } from './components/CustomerAuthPage';
import { CustomerAccountPage } from './components/CustomerAccountPage';
import { customerFetch, setCustomerSessionToken } from './utils/customerAuth';
import type { CartItem, CustomerUser, Product, SiteContent } from './types';

const CART_STORAGE_KEY = 'ojas_shopping_bag_v1';
const ENTRY_DISMISSED_KEY = 'ojas_welcome_entry_dismissed';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [products, setProducts] = useState<Product[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [bagNotice, setBagNotice] = useState('');
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [customerAuthChecked, setCustomerAuthChecked] = useState(false);
  const [entryDismissed, setEntryDismissed] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(ENTRY_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [whatsAppTarget, setWhatsAppTarget] = useState<{
    product: Product;
    variantId: string;
    quantity: number;
  } | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Unable to load OJAS storefront.');
      const data = await res.json();
      setProducts(data.products || []);
      setContent(data.content || null);
      setLoadError('');
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to connect to OJAS studio.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomerSession = useCallback(async () => {
    try {
      const res = await customerFetch('/api/customer/me');
      if (res.ok) {
        const data = await res.json();
        setCustomerUser(data.authenticated && data.customer ? data.customer : null);
      }
    } catch {
      // ignore customer session check failure
    } finally {
      setCustomerAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    fetchStorefront();
    fetchCustomerSession();
  }, [fetchStorefront, fetchCustomerSession]);

  const handleDismissEntry = useCallback(() => {
    try {
      window.sessionStorage.setItem(ENTRY_DISMISSED_KEY, '1');
    } catch {
      // ignore storage unavailability
    }
    setEntryDismissed(true);
  }, []);

  const handleCustomerLogout = useCallback(async () => {
    try {
      await customerFetch('/api/customer/logout', { method: 'POST' });
    } catch {
      // ignore network issue
    }
    setCustomerSessionToken(null);
    setCustomerUser(null);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota issues
    }
  }, [cart]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    const cleanPath = path.split('?')[0] || '/';
    const fullCurrent = window.location.pathname + window.location.search;
    if (path !== fullCurrent) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(cleanPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // SEO Title & Description sync per page
  useEffect(() => {
    let title = 'OJAS — Pure by Nature | Natural Products, Better Life.';
    let description =
      'OJAS brings nature’s goodness to everyday life with small-batch Egg Shell Powder and hand-poured Artisanal Designer Candles.';

    if (currentPath === '/products') {
      title = 'Our Products | OJAS — Pure by Nature';
      description =
        'Shop OJAS Egg Shell Powder and Artisanal Designer Candles crafted in small batches in India.';
    } else if (currentPath.startsWith('/products/')) {
      const slug = currentPath.replace('/products/', '');
      const prod = products.find((p) => p.slug === slug);
      if (prod) {
        title = `${prod.name} | OJAS — Pure by Nature`;
        description = prod.description.slice(0, 155);
      }
    } else if (currentPath === '/about') {
      title = 'About Us | OJAS — Pure by Nature';
    } else if (currentPath === '/contact') {
      title = 'Contact Us | OJAS — Pure by Nature';
    } else if (currentPath === '/payment') {
      title = 'UPI Payment Details | OJAS — Pure by Nature';
    } else if (currentPath === '/privacy-policy') {
      title = 'Privacy Policy | OJAS — Pure by Nature';
    } else if (currentPath === '/terms') {
      title = 'Terms and Conditions | OJAS — Pure by Nature';
    } else if (currentPath === '/shipping-policy') {
      title = 'Shipping and Return Policy | OJAS — Pure by Nature';
    } else if (
      currentPath === '/login' ||
      currentPath === '/signup' ||
      currentPath === '/forgot-password' ||
      currentPath === '/reset-password'
    ) {
      title = 'Login / Continue | OJAS — Pure by Nature';
    } else if (currentPath === '/account') {
      title = 'My Account & Order Tracking | OJAS — Pure by Nature';
    } else if (currentPath === '/admin') {
      title = 'Owner Portal | OJAS';
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
  }, [currentPath, products]);

  const handleAddToCart = (
    product: Product,
    variantId: string,
    openDrawer = false,
    quantity = 1
  ) => {
    const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
    if (!variant || variant.stock <= 0) return;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === product.id && i.variantId === variant.id
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        const nextQty = Math.min(variant.stock, next[existingIdx].quantity + quantity);
        next[existingIdx] = {
          ...next[existingIdx],
          price: variant.price,
          stock: variant.stock,
          quantity: nextQty,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          productName: product.name,
          variantId: variant.id,
          variantLabel: variant.label,
          price: variant.price,
          stock: variant.stock,
          quantity: Math.min(variant.stock, quantity),
          image: product.images[0] || '',
        },
      ];
    });

    if (openDrawer) {
      setCartOpen(true);
    } else {
      setBagNotice(`${product.name} (${variant.label}) added to bag`);
      setTimeout(() => setBagNotice(''), 2600);
    }
  };

  const handleOpenWhatsAppOrder = (product: Product, variantId: string, quantity = 1) => {
    setWhatsAppTarget({ product, variantId, quantity });
  };

  const handleUpdateQty = (productId: number, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: number, variantId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-serif text-3xl tracking-[0.18em] text-[#163024]">OJAS</p>
          <p className="text-xs uppercase tracking-widest text-[#B88A3B]">Pure by Nature</p>
        </div>
      </div>
    );
  }

  if (loadError || !content) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center px-4">
        <div className="max-w-md p-8 rounded-2xl bg-white border border-[#E5DEC9] text-center space-y-4">
          <h1 className="font-serif text-2xl font-semibold text-[#163024]">
            Unable to Connect to Studio
          </h1>
          <p className="text-sm text-[#525E56]">{loadError || 'Please refresh to try again.'}</p>
          <button
            type="button"
            onClick={fetchStorefront}
            className="px-5 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (currentPath === '/admin') {
      return (
        <AdminDashboard
          onStorefrontUpdated={fetchStorefront}
          onNavigate={navigate}
        />
      );
    }
    if (
      currentPath === '/login' ||
      currentPath === '/signup' ||
      currentPath === '/forgot-password' ||
      currentPath === '/reset-password'
    ) {
      return (
        <CustomerAuthPage
          customerUser={customerUser}
          onNavigate={navigate}
          onAuthenticated={(customer) => {
            setCustomerUser(customer);
            handleDismissEntry();
          }}
        />
      );
    }
    if (currentPath === '/account') {
      return (
        <CustomerAccountPage
          customerUser={customerUser}
          content={content}
          onCustomerUpdated={(updated) => setCustomerUser(updated)}
          onLogout={handleCustomerLogout}
          onNavigate={navigate}
        />
      );
    }
    if (currentPath === '/products') {
      return (
        <ProductsPage
          products={products}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
          onOrderOnWhatsApp={handleOpenWhatsAppOrder}
        />
      );
    }
    if (currentPath.startsWith('/products/')) {
      const slug = currentPath.replace('/products/', '');
      const product = products.find((p) => p.slug === slug);
      return (
        <ProductDetailPage
          product={product}
          content={content}
          onNavigate={navigate}
          onAddToCart={handleAddToCart}
          onOrderOnWhatsApp={handleOpenWhatsAppOrder}
        />
      );
    }
    if (currentPath === '/about') {
      return <AboutPage content={content} onNavigate={navigate} />;
    }
    if (currentPath === '/contact') {
      return <ContactPage content={content} onNavigate={navigate} />;
    }
    if (currentPath === '/payment') {
      return <PaymentPage content={content} onNavigate={navigate} />;
    }
    if (currentPath === '/privacy-policy') {
      return <PolicyPage type="privacy" content={content} />;
    }
    if (currentPath === '/terms') {
      return <PolicyPage type="terms" content={content} />;
    }
    if (currentPath === '/shipping-policy') {
      return <PolicyPage type="shipping" content={content} />;
    }

    return (
      <HomePage
        products={products}
        content={content}
        onNavigate={navigate}
        onAddToCart={handleAddToCart}
        onOrderOnWhatsApp={handleOpenWhatsAppOrder}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] text-[#1C241F]">
      {currentPath !== '/admin' && (
        <Header
          currentPath={currentPath}
          onNavigate={navigate}
          cartCount={cartCount}
          onOpenCart={() => setCartOpen(true)}
          announcementBar={content.announcementBar}
          customerUser={customerUser}
          onCustomerLogout={handleCustomerLogout}
        />
      )}

      <main className="flex-1">{renderPage()}</main>

      {currentPath !== '/admin' && <Footer content={content} onNavigate={navigate} />}

      {/* Subtle Add-to-Bag Feedback Toast */}
      {bagNotice && (
        <div className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-xl bg-[#163024] text-[#FAF8F3] border border-[#B88A3B] shadow-lg flex items-center gap-3 text-xs sm:text-sm">
          <Check className="w-4 h-4 text-[#D4AF63] shrink-0" />
          <span>{bagNotice}</span>
          <button
            type="button"
            onClick={() => {
              setBagNotice('');
              setCartOpen(true);
            }}
            className="text-[#D4AF63] font-semibold underline underline-offset-2 ml-1 whitespace-nowrap"
          >
            View Bag
          </button>
        </div>
      )}

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
        onOrderCreated={fetchStorefront}
        content={content}
        customerUser={customerUser}
        onNavigateToLogin={() => navigate('/login')}
        onNavigateToAccount={() => navigate('/account')}
      />

      <WhatsAppOrderModal
        product={whatsAppTarget?.product || null}
        initialVariantId={whatsAppTarget?.variantId}
        initialQuantity={whatsAppTarget?.quantity}
        isOpen={Boolean(whatsAppTarget)}
        onClose={() => {
          setWhatsAppTarget(null);
          fetchStorefront();
        }}
        content={content}
        customerUser={customerUser}
        onNavigateToLogin={() => navigate('/login')}
      />

      <CustomerEntryModal
        isOpen={
          customerAuthChecked &&
          !customerUser &&
          !entryDismissed &&
          currentPath !== '/admin' &&
          currentPath !== '/login' &&
          currentPath !== '/signup'
        }
        onDismiss={handleDismissEntry}
        onAuthenticated={(customer) => {
          setCustomerUser(customer);
          handleDismissEntry();
        }}
      />
    </div>
  );
}
