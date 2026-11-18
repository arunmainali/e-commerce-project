const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('auction_access_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auction_access_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('auction_access_token');
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API request failed with status ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.error) {
        errorMsg = errBody.error;
      }
    } catch {
      // Non-JSON error body
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed with status ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.error) errorMsg = errBody.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}
