const resolveApiBaseUrl = (): string => {
  const rawUrl = (
    import.meta.env.VITE_API_BASE_URL
  ).trim();
  // Strip trailing slashes
  const cleanUrl = rawUrl.replace(/\/+$/, '');
  // Ensure /api/v1 is present
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};
export const API_BASE_URL = resolveApiBaseUrl();
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT Bearer token if present
  const token = localStorage.getItem('alibori_access_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const message =
      errorData.detail ||
      errorData.error ||
      errorData.message ||
      (typeof errorData === 'string' ? errorData : `Request failed with status ${response.status}`);
    const err = new Error(message);
    (err as any).data = errorData;
    (err as any).status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
