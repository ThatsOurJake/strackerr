let drawerReturnFocus;

const setDrawerOpen = (isOpen) => {
  const drawer = document.querySelector("[data-mobile-drawer]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const wasOpen = !drawer?.classList.contains("hidden");

  drawer?.classList.toggle("hidden", !isOpen);
  menuToggle?.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("overflow-hidden", isOpen);

  if (isOpen) {
    drawerReturnFocus = document.activeElement;
    drawer?.querySelector("[data-menu-close]")?.focus();
  } else if (wasOpen) {
    drawerReturnFocus?.focus();
  }
};

const trapFocus = (event) => {
  const drawer = document.querySelector("[data-mobile-drawer]");
  if (event.key !== "Tab" || drawer?.classList.contains("hidden")) {
    return;
  }

  const focusableElements = drawer.querySelectorAll(
    "[data-drawer-panel] a[href], [data-drawer-panel] button:not([disabled])",
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement?.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
  }
};

export const initializeMobileDrawer = () => {
  document.querySelector("[data-menu-toggle]")?.addEventListener("click", () => {
    setDrawerOpen(true);
  });

  document.querySelectorAll("[data-menu-close]").forEach((element) => {
    element.addEventListener("click", () => setDrawerOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDrawerOpen(false);
    }

    trapFocus(event);
  });

  document.querySelectorAll("[data-mobile-drawer] [data-nav-link]").forEach((link) => {
    link.addEventListener("click", () => setDrawerOpen(false));
  });
};
