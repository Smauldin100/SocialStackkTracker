import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

type RequestResult = {
  ok: true;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: Record<string, unknown>
): Promise<RequestResult> {
  try {
    console.log(`Making ${method} request to ${url}${body ? ' with body' : ''}`);

    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      console.error(`Request failed: ${response.status} ${response.statusText}`);

      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      console.error('Error message:', message);
      return { ok: false, message };
    }

    console.log(`Request successful: ${response.status}`);
    return { ok: true };
  } catch (error) {
    console.error('Request error:', error);
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function fetchUser(): Promise<SelectUser | null> {
  console.log('Fetching user data...');

  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.log('User not authenticated');
      return null;
    }

    console.error(`User fetch failed: ${response.status} ${response.statusText}`);
    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const errorText = await response.text();
    console.error('Error details:', errorText);
    throw new Error(`${response.status}: ${errorText}`);
  }

  const userData = await response.json();
  console.log('User data fetched successfully');
  return userData;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  email: string;
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false
  });

  const loginMutation = useMutation<RequestResult, Error, LoginCredentials>({
    mutationFn: (credentials) => {
      console.log('Attempting login...');
      return handleRequest('/api/login', 'POST', credentials);
    },
    onSuccess: () => {
      console.log('Login successful, invalidating user query');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error) => {
      console.error('Login error:', error);
    }
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => {
      console.log('Attempting logout...');
      return handleRequest('/api/logout', 'POST');
    },
    onSuccess: () => {
      console.log('Logout successful, invalidating user query');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });

  const registerMutation = useMutation<RequestResult, Error, RegisterCredentials>({
    mutationFn: (userData) => {
      console.log('Attempting registration...');
      return handleRequest('/api/register', 'POST', userData);
    },
    onSuccess: () => {
      console.log('Registration successful, invalidating user query');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}