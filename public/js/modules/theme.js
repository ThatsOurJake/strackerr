const normalizeTheme = (value) => (value === "light" ? "light" : "dark");

const applyTheme = (theme) => {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(isDark));
    if (button.getAttribute("aria-label")) {
      button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }
  });
};

export const initializeThemeToggle = () => {
  const initialTheme = normalizeTheme(
    localStorage.getItem("theme") ?? document.documentElement.getAttribute("data-theme"),
  );
  applyTheme(initialTheme);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem("theme", nextTheme);
      applyTheme(nextTheme);
    });
  });
};
