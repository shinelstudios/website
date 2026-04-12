// src/utils/perfHelpers.js
export const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(num, options = {}) {
  try {
    if (!options || Object.keys(options).length === 0) {
      return INR_FORMATTER.format(Number(num || 0));
    }
    const cfg = {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      ...options,
    };
    return new Intl.NumberFormat("en-IN", cfg).format(Number(num || 0));
  } catch (err) {
    return `₹${num || 0}`;
  }
}
