document.addEventListener("DOMContentLoaded", () => {
  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");

  const newUserButton = document.getElementById("newUserButton");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const resendVerificationLink = document.getElementById("resendVerificationLink");

  const registerBackdrop = document.getElementById("registerBackdrop");
  const registerClose = document.getElementById("registerClose");
  const registerForm = document.getElementById("registerForm");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const registerPasswordConfirm = document.getElementById("registerPasswordConfirm");
  const registerFirstName = document.getElementById("registerFirstName");
  const registerLastName = document.getElementById("registerLastName");

  const forgotPasswordBackdrop = document.getElementById("forgotPasswordBackdrop");
  const forgotPasswordClose = document.getElementById("forgotPasswordClose");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const forgotPasswordEmail = document.getElementById("forgotPasswordEmail");

  const resendVerificationBackdrop = document.getElementById("resendVerificationBackdrop");
  const resendVerificationClose = document.getElementById("resendVerificationClose");
  const resendVerificationForm = document.getElementById("resendVerificationForm");
  const resendVerificationEmail = document.getElementById("resendVerificationEmail");

  const showModal = (backdrop) => {
    if (!backdrop) return;
    backdrop.classList.add("show");
  };

  const hideModal = (backdrop) => {
    if (!backdrop) return;
    backdrop.classList.remove("show");
  };

  const hideAllModals = () => {
    [registerBackdrop, forgotPasswordBackdrop, resendVerificationBackdrop].forEach(hideModal);
  };

  const buildEmailMessage = (data, defaultMessage, linkLabel, linkKey) => {
    let message = data?.message || defaultMessage;

    if (data?.email_error) {
      message += `\n\nEmail error: ${data.email_error}`;
    }

    if (data?.email_hint) {
      message += `\nHint: ${data.email_hint}`;
    }

    if (data?.[linkKey]) {
      message += `\n\n${linkLabel}: ${data[linkKey]}`;
    }

    if (data?.email_warning) {
      message += `\n\n${data.email_warning}`;
    }

    return message;
  };

  if (newUserButton) {
    newUserButton.addEventListener("click", (e) => {
      e.preventDefault();
      showModal(registerBackdrop);
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (loginEmail?.value) forgotPasswordEmail.value = loginEmail.value.trim();
      showModal(forgotPasswordBackdrop);
    });
  }

  if (resendVerificationLink) {
    resendVerificationLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (loginEmail?.value) resendVerificationEmail.value = loginEmail.value.trim();
      showModal(resendVerificationBackdrop);
    });
  }

  if (registerClose) registerClose.addEventListener("click", () => hideModal(registerBackdrop));
  if (forgotPasswordClose) forgotPasswordClose.addEventListener("click", () => hideModal(forgotPasswordBackdrop));
  if (resendVerificationClose) resendVerificationClose.addEventListener("click", () => hideModal(resendVerificationBackdrop));

  [registerBackdrop, forgotPasswordBackdrop, resendVerificationBackdrop].forEach((backdrop) => {
    if (!backdrop) return;
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) hideModal(backdrop);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideAllModals();
  });

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = (loginEmail?.value || "").trim();
      const password = (loginPassword?.value || "").trim();

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      if (!isValidEmail(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      try {
        const res = await fetch("/api/login/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          let message = data.message || "Login failed.";
          if (data.hint) message += `\n\n${data.hint}`;
          alert(message);
          return;
        }

        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }

        const role =
          data?.user?.role ||
          data?.user?.profile_type ||
          data?.profile_type ||
          data?.profileType ||
          data?.user?.profileType ||
          null;

        if (role && String(role).toLowerCase() === "admin") {
          window.location.href = "/adminView";
        } else {
          window.location.href = "/home";
        }
      } catch (err) {
        console.error("Login request failed:", err);
        alert("Something went wrong. Please try again.");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = (registerEmail?.value || "").trim();
      const password = (registerPassword?.value || "").trim();
      const confirm = (registerPasswordConfirm?.value || "").trim();
      const first_name = (registerFirstName?.value || "").trim();
      const last_name = (registerLastName?.value || "").trim();

      if (!email || !password || !confirm || !first_name || !last_name) {
        alert("Please fill out all required fields.");
        return;
      }

      if (!isValidEmail(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      if (password.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
      }

      if (password !== confirm) {
        alert("Passwords do not match.");
        return;
      }

      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ first_name, last_name, email, password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.message || "Registration failed.");
          return;
        }

        alert(
          buildEmailMessage(
            data,
            "Account created! Please verify your email before logging in.",
            "Verification link",
            "verification_url"
          )
        );
        registerForm.reset();
        hideModal(registerBackdrop);
      } catch (err) {
        console.error("Register request failed:", err);
        alert("Something went wrong. Please try again.");
      }
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = (forgotPasswordEmail?.value || "").trim();
      if (!email || !isValidEmail(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      try {
        const res = await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json().catch(() => ({}));
        alert(
          buildEmailMessage(
            data,
            "If this email is registered, a password reset link has been sent.",
            "Reset link",
            "reset_url"
          )
        );
        forgotPasswordForm.reset();
        hideModal(forgotPasswordBackdrop);
      } catch (err) {
        console.error("Forgot password request failed:", err);
        alert("Something went wrong. Please try again.");
      }
    });
  }

  if (resendVerificationForm) {
    resendVerificationForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = (resendVerificationEmail?.value || "").trim();
      if (!email || !isValidEmail(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      try {
        const res = await fetch("/api/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json().catch(() => ({}));
        alert(
          buildEmailMessage(
            data,
            "If the account exists and still needs verification, a new verification email has been sent.",
            "Verification link",
            "verification_url"
          )
        );
        resendVerificationForm.reset();
        hideModal(resendVerificationBackdrop);
      } catch (err) {
        console.error("Resend verification request failed:", err);
        alert("Something went wrong. Please try again.");
      }
    });
  }
});
