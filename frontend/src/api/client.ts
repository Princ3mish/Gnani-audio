const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  error_code: string;

  constructor(error_code: string, message: string) {
    super(message);
    self.name = 'ApiError';
    this.error_code = error_code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorCode = 'HTTP_ERROR';
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;

    try {
      const errorJson = await response.json();
      if (errorJson.error_code) {
        errorCode = errorJson.error_code;
      }
      if (errorJson.message) {
        errorMessage = errorJson.message;
      } else if (errorJson.detail) {
        errorMessage = typeof errorJson.detail === 'string' 
          ? errorJson.detail 
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Body wasn't JSON
    }

    throw new ApiError(errorCode, errorMessage);
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<T>(response);
}

export async function apiPostMultipart<T>(path: string, formData: FormData): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

