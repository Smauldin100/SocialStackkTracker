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
  body?: InsertUser
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
  } catch (e: any) {
    console.error('Request error:', e);
    return { ok: false, message: e.toString() };
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

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false
  });

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => {
      console.log('Attempting login...');
      return handleRequest('/api/login', 'POST', userData);
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
    },
    onError: (error) => {
      console.error('Logout error:', error);
    }
  });

  const registerMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => {
      console.log('Attempting registration...');
      return handleRequest('/api/register', 'POST', userData);
    },
    onSuccess: () => {
      console.log('Registration successful, invalidating user query');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error) => {
      console.error('Registration error:', error);
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