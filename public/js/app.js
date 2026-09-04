const renderIcons = () => window.lucide?.createIcons();

const configureHtmxElements = (root = document) => {
  root.querySelectorAll("[hx-get], [hx-post], [hx-delete]").forEach((element) => {
    if (!element.hasAttribute("hx-indicator")) {
      element.setAttribute("hx-indicator", "#global-htmx-indicator");
    }
  });
};

const configureImageFallbacks = (root = document) => {
  root.querySelectorAll("img[data-image-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      image.classList.add("hidden");
      const fallback = image.nextElementSibling;
      fallback?.classList.remove("hidden");
      fallback?.classList.add("flex");
    }, { once: true });
  });
};

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

const initializeChart = () => {
  const element = document.getElementById("activity-chart");
  if (!element || !window.echarts) {
    return;
  }
  const chartData = JSON.parse(element.dataset.chart);
  const chart = window.echarts.init(element);
  const formatHours = (value) => Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
  const isDark = document.documentElement.classList.contains("dark");
  chart.setOption({
    animationDuration: 300,
    grid: { left: 48, right: 8, top: 32, bottom: 32 },
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark ? "#242424" : "#FFFFFF",
      borderColor: isDark ? "#2C2C2C" : "#DDD8CF",
      textStyle: { color: isDark ? "#F0EDE8" : "#111111" },
      valueFormatter: (value) => `${formatHours(value)} hours`,
    },
    xAxis: { type: "category", data: chartData.labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#9CA3AF", fontSize: 11 } },
    yAxis: {
      type: "value",
      name: "Hours",
      nameTextStyle: { color: "#9CA3AF", fontSize: 11 },
      splitLine: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#9CA3AF", formatter: (value) => `${formatHours(value)}h` },
    },
    series: [{ name: "Duration", type: "bar", data: chartData.values, itemStyle: { color: isDark ? "#F0EDE8" : "#111111" }, barMaxWidth: 28 }],
  });
  window.addEventListener("resize", () => chart.resize());
};

document.addEventListener("DOMContentLoaded", () => {
  renderIcons();
  configureHtmxElements();
  configureImageFallbacks();
  initializeChart();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  });

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

    const drawer = document.querySelector("[data-mobile-drawer]");
    if (event.key !== "Tab" || drawer?.classList.contains("hidden")) {
      return;
    }

    const focusableElements = drawer.querySelectorAll("[data-drawer-panel] a[href], [data-drawer-panel] button:not([disabled])");
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  });

  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const href = link.getAttribute("href");
    const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    }
    if (link.closest("[data-mobile-drawer]")) {
      link.addEventListener("click", () => setDrawerOpen(false));
    }
  });

  document.querySelectorAll(".flash-message").forEach((message) => {
    window.setTimeout(() => message.remove(), 4000);
  });

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
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const closeButton = target.closest("[data-close-identify-panel]");
  if (!closeButton) {
    return;
  }

  const panelContainer = closeButton.closest("#identify-panel, #collection-identify-panel");
  if (panelContainer instanceof HTMLElement) {
    panelContainer.innerHTML = "";
  }
});

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
  renderIcons();
  configureHtmxElements(event.detail.target);
  configureImageFallbacks(event.detail.target);
});
