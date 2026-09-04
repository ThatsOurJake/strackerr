export const configureHtmxElements = (root = document) => {
  root.querySelectorAll("[hx-get], [hx-post], [hx-delete]").forEach((element) => {
    if (!element.hasAttribute("hx-indicator")) {
      element.setAttribute("hx-indicator", "#global-htmx-indicator");
    }
  });
};

export const registerHtmxLifecycle = ({ onAfterSwap }) => {
  document.addEventListener("htmx:configRequest", (event) => {
    event.detail.headers["X-CSRF-Token"] = document.body.dataset.csrfToken;
  });

  document.addEventListener("htmx:beforeRequest", (event) => {
    event.detail.elt.querySelector?.("button[type='submit']")?.setAttribute("disabled", "");
    if (event.detail.elt.matches?.("button")) {
      event.detail.elt.setAttribute("disabled", "");
    }
  });

  document.addEventListener("htmx:afterRequest", (event) => {
    event.detail.elt.querySelector?.("button[type='submit']")?.removeAttribute("disabled");
    if (event.detail.elt.matches?.("button")) {
      event.detail.elt.removeAttribute("disabled");
    }
  });

  document.addEventListener("htmx:afterSwap", (event) => {
    onAfterSwap(event.detail.target);
  });
};
