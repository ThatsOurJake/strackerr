export const initializePasswordMatchValidation = () => {
  const confirmPassword = document.getElementById("confirmPassword");
  const password = document.getElementById("password");
  const passwordError = document.getElementById("confirmPasswordError");

  const validatePasswordMatch = () => {
    const mismatch = confirmPassword?.value !== password?.value;
    confirmPassword?.setCustomValidity(mismatch ? "Passwords do not match" : "");
    passwordError?.classList.toggle("hidden", !mismatch);
  };

  confirmPassword?.addEventListener("input", validatePasswordMatch);
  password?.addEventListener("input", validatePasswordMatch);
};
