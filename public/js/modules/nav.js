export const initializeActiveNavLinks = () => {
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const href = link.getAttribute("href");
    const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    }
  });
};
