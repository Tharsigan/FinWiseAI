/**
 * Persisted preference; drive CSS via `html.dark`.
 * @param {"light"|"dark"} theme
 */
export function applyDocumentTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
}
