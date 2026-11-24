import React, { useState } from 'react';
import { ShoppingBag, Menu, X, User, LogOut } from 'lucide-react';
import { BrandMark } from './BrandMark';
import type { CustomerUser } from '../types';

export type AppRoute =
  | '/'
  | '/products'
  | '/about'
  | '/contact'
  | '/payment'
  | '/login'
  | '/signup'
  | '/forgot-password'
  | '/reset-password'
  | '/account'
  | '/privacy-policy'
  | '/terms'
  | '/shipping-policy'
  | '/admin'
  | `/products/${string}`;

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  announcementBar?: string;
  customerUser: CustomerUser | null;
  onCustomerLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  cartCount,
  onOpenCart,
  announcementBar,
  customerUser,
  onCustomerLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  const firstName = customerUser?.name?.trim()
    ? customerUser.name.trim().split(/\s+/)[0]
    : 'Account';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F3]/95 backdrop-blur-md border-b border-[#E5DEC9]">
      {announcementBar && (
        <div className="hidden sm:block bg-[#163024] text-[#FAF8F3] text-xs tracking-wide text-center py-1.5 px-4">
          {announcementBar}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('/')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4332] rounded"
          aria-label="OJAS Home"
        >
          <BrandMark size="sm" tone="dark" />
          <span className="font-serif text-2xl sm:text-[26px] font-semibold tracking-[0.14em] text-[#163024] whitespace-nowrap shrink-0">
            OJAS
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
          {navLinks.map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4332] ${
                  isActive
                    ? 'text-[#163024]'
                    : 'text-[#525E56] hover:text-[#163024]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-[#B88A3B]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Customer Account + Bag + Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {customerUser ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNav('/account')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                  currentPath === '/account'
                    ? 'bg-[#F2EFE6] border-[#1B4332] text-[#163024]'
                    : 'bg-white border-[#E5DEC9] text-[#163024] hover:bg-[#F2EFE6]'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#B88A3B]" />
                <span>{firstName}</span>
              </button>
              <button
                type="button"
                onClick={onCustomerLogout}
                title="Sign out"
                aria-label="Sign out"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E5DEC9] bg-white text-[#525E56] hover:text-[#163024] hover:bg-[#F2EFE6] transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center">
              <button
                type="button"
                onClick={() => handleNav('/login')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border transition-colors text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 min-h-[40px] ${
                  currentPath === '/login'
                    ? 'bg-[#E5DEC9] border-[#1B4332] text-[#163024]'
                    : 'border-[#B88A3B]/60 bg-[#F2EFE6] text-[#163024] hover:bg-[#E5DEC9]'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#B88A3B]" />
                <span>Login / Continue</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#163024] text-[#FAF8F3] hover:bg-[#1B4332] transition-colors text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88A3B]"
          >
            <ShoppingBag className="w-4 h-4 text-[#D4AF63]" />
            <span>Bag</span>
            <span className="tabular-nums font-semibold text-[#D4AF63]">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E5DEC9] text-[#163024] hover:bg-[#F2EFE6] transition-colors"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-[#E5DEC9] bg-[#FAF8F3] px-4 py-4 space-y-1.5"
          aria-label="Mobile navigation"
        >
          {navLinks.map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
                className={`w-full text-left px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F2EFE6] text-[#163024]'
                    : 'text-[#525E56] hover:bg-[#F2EFE6]/60 hover:text-[#163024]'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-[#E5DEC9] flex items-center gap-2">
            {customerUser ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav('/account')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-sm font-semibold"
                >
                  <User className="w-4 h-4 text-[#D4AF63]" />
                  <span>My Account ({firstName})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onCustomerLogout();
                  }}
                  className="px-3.5 py-2.5 rounded-lg border border-[#E5DEC9] bg-white text-sm font-medium text-[#163024]"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('/login')}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#163024] text-[#FAF8F3] text-sm font-semibold"
              >
                <User className="w-4 h-4 text-[#D4AF63]" />
                <span>Login / Continue</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
