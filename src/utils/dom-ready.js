export function domReady() {
  if (document.readyState !== "loading") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
}
