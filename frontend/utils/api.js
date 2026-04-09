export function apiFetch(url, options = {}) {
  const token = localStorage.getItem("authToken"); // token saved at login
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
      ...(options.headers || {})
    }
  });
}
