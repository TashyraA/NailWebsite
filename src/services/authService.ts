
/**
 * InLoveNailz administrator authentication
 *
 * Authentication is handled by secure backend APIs.
 * Administrator credentials are never stored in
 * frontend source code or localStorage.
 */

export const login = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/admin-login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();

    return (
      result.success === true &&
      result.authenticated === true
    );
  } catch (error) {
    console.error('Administrator login request failed:', error);
    return false;
  }
};

/**
 * Verify the administrator session with the server.
 *
 * Never trust localStorage as proof of authentication.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/admin-session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();

    return (
      result.success === true &&
      result.authenticated === true
    );
  } catch (error) {
    console.error('Administrator session check failed:', error);
    return false;
  }
};

/**
 * Clear the administrator's server-issued session cookie.
 */
export const logout = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/admin-logout', {
      method: 'POST',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();

    return result.success === true;
  } catch (error) {
    console.error('Administrator logout request failed:', error);
    return false;
  }
};
