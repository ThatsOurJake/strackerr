export const initializeFlashMessages = () => {
  document.querySelectorAll(".flash-message").forEach((message) => {
    window.setTimeout(() => message.remove(), 4000);
  });
};
