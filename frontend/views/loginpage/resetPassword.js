// frontend/views/loginpage/resetPassword.js

document.addEventListener('DOMContentLoaded', () => {
  const pathParts = window.location.pathname.split('/');
  const token = pathParts[pathParts.length - 1]; // /reset-password/<token>

  const resetBtn = document.getElementById('reset-btn');
  const passwordInput = document.getElementById('new-password');

  if (!resetBtn || !passwordInput) return;

  resetBtn.addEventListener('click', async () => {
    const password = passwordInput.value.trim();

    if (!password) {
      alert('Please enter a new password.');
      return;
    }

    try {
      const res = await fetch(`/api/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || 'Error resetting password.');
        return;
      }

      alert(data.message || 'Password updated. You can now log in.');
      window.location.href = '/'; // back to login
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
  });
});
