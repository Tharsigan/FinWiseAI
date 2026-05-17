/** @type {Map<string, Promise<void>>} */
const scriptPromises = new Map();

/**
 * Load MPGS Hosted Checkout script once per URL.
 * @param {string} src
 * @returns {Promise<void>}
 */
export function loadMpgsCheckoutScript(src) {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("MPGS checkout requires a browser environment."));
  }
  const cached = scriptPromises.get(src);
  if (cached) return cached;

  const promise = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      if (typeof window.Checkout === "undefined") {
        reject(new Error("MPGS checkout.js loaded but global Checkout was not defined."));
        return;
      }
      resolve();
    };
    el.onerror = () => {
      reject(new Error("Failed to load MPGS checkout.js."));
    };
    document.head.appendChild(el);
  });

  scriptPromises.set(src, promise);
  return promise;
}

/**
 * Show the MPGS payment page using a session from POST /api/payment/create-session.
 * @param {{
 *   merchantId: string;
 *   sessionId: string;
 *   checkoutJsUrl: string;
 *   merchantName?: string;
 * }} opts
 * @returns {Promise<void>}
 */
export async function showMpgsHostedCheckoutPage(opts) {
  await loadMpgsCheckoutScript(opts.checkoutJsUrl);
  const Checkout = window.Checkout;
  if (!Checkout || typeof Checkout.configure !== "function") {
    throw new Error("MPGS Checkout is not available.");
  }

  /** @type {Record<string, unknown>} */
  const config = {
    merchant: opts.merchantId,
    session: { id: opts.sessionId },
  };
  if (opts.merchantName) {
    config.interaction = { merchant: { name: opts.merchantName } };
  }

  Checkout.configure(config);

  if (typeof Checkout.showPaymentPage !== "function") {
    throw new Error("MPGS Checkout.showPaymentPage is not available.");
  }
  Checkout.showPaymentPage();
}
