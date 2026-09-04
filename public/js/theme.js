const normalizeTheme = (value) => (value === "light" ? "light" : "dark");

let savedTheme;
try {
  savedTheme = localStorage.getItem("theme");
} catch {
  savedTheme = null;
}

const serverTheme = document.documentElement.getAttribute("data-theme");
const theme = normalizeTheme(savedTheme ?? serverTheme);

document.documentElement.classList.toggle("dark", theme === "dark");
document.documentElement.setAttribute("data-theme", theme);
document.documentElement.style.colorScheme = theme;
