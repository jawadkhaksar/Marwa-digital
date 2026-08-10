const COOKIE_NAME = "googtrans";

export type SiteLang = "en" | "de";

export function getCurrentLang(): SiteLang {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=/en/([a-z]+)`));
  return match?.[1] === "de" ? "de" : "en";
}

export function setLang(lang: SiteLang) {
  if (typeof document === "undefined") return;

  if (lang === "en") {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } else {
    document.cookie = `${COOKIE_NAME}=/en/${lang}; path=/;`;
  }

  window.location.reload();
}
