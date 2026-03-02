/**
 * API client utility
 * Automatically adds Bearer token to all API requests
 */

const API_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || '';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiClient(endpoint: string, options: FetchOptions = {}) {
  const { params, ...fetchOptions } = options;

  // Build URL with query params if provided
  let url = endpoint;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url = ${endpoint}?;
  }

  // Add Authorization header
  const headers = {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { 'Authorization': Bearer  }),
    ...fetchOptions.headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(API error:  );
  }

  return response.json();
}

// Convenience methods
export const api = {
  get: (endpoint: string, params?: Record<string, string>) => 
    apiClient(endpoint, { method: 'GET', params }),
  
  post: (endpoint: string, data?: any) => 
    apiClient(endpoint, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  put: (endpoint: string, data?: any) => 
    apiClient(endpoint, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  delete: (endpoint: string) => 
    apiClient(endpoint, { method: 'DELETE' }),
};
