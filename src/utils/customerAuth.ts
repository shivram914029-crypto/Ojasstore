const CUSTOMER_SESSION_TOKEN_KEY = 'ojas_customer_session_token';

export function getCustomerSessionToken(): string | null {
  try {
    return (
      window.localStorage.getItem(CUSTOMER_SESSION_TOKEN_KEY) ||
      window.sessionStorage.getItem(CUSTOMER_SESSION_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

export function setCustomerSessionToken(token: string | null) {
  try {
    if (!token) {
      window.sessionStorage.removeItem(CUSTOMER_SESSION_TOKEN_KEY);
      window.localStorage.removeItem(CUSTOMER_SESSION_TOKEN_KEY);
      return;
    }
    window.localStorage.setItem(CUSTOMER_SESSION_TOKEN_KEY, token);
    window.sessionStorage.removeItem(CUSTOMER_SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage unavailability
  }
}

export async function customerFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getCustomerSessionToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });

  const urlStr = typeof input === 'string' ? input : input.toString();
  if (
    res.status === 401 &&
    urlStr.startsWith('/api/customer/') &&
    !urlStr.includes('/api/customer/login') &&
    !urlStr.includes('/api/customer/continue')
  ) {
    setCustomerSessionToken(null);
  }
  return res;
}

export function formatIndianMobile10(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function isValidIndianMobile10(raw: string): boolean {
  const digits10 = formatIndianMobile10(raw);
  return /^[6-9]\d{9}$/.test(digits10);
}
