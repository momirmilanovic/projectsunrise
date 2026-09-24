export function toCents(text) {
  const match = String(text).match(/(\d+)(?:[.,](\d{1,2}))?/);
  if (!match) throw new Error(`No money value found in "${text}"`);
  const [, whole, fraction = ''] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function sumCents(values) {
  return values.reduce((total, value) => total + toCents(value), 0);
}

export function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
