export interface AuthResponse {
  error?: string;
  message?: string;
  user?: { id: string; username: string; email?: string };
  requiresToken?: boolean;
  has2FA?: boolean;
  qrCodeUrl?: string;
  secret?: string;
}

const BASE_URL = "http://localhost:4000";

export async function signup(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

// const response = await fetch('/login', {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({ email, password, token })
//           });
export async function login(email: string, password: string, token?: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, token }),
  });
  return await res.json();
}

export async function googleLogin(): Promise<void> {
  window.location.href = `${BASE_URL}/auth/google`;
}

export async function logout(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: refreshToken }),
  });
  return await res.json();
}

export async function checkServerLoginStatus(accessToken: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/current-user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return await res.json();
}

export async function check2FAStatus(email: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/check-2fa?email=${encodeURIComponent(email)}`);
  return await res.json();
}

export async function fetchUsers(accessToken: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return await res.json();
}

export async function verifyToken(email: string, token: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token }),
  });
  return await res.json();
}

export async function generateSecret(email: string, accessToken: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ email }),
  });
  return await res.json();
}

export async function changeUsername(newUsername: string, accessToken: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/change-username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ newUsername }),
  });
  return await res.json();
}

export async function changePassword(newPassword: string, accessToken: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ newPassword }),
  });
  return await res.json();
}
