export const INVOICE_PATTERN = /INV-\d+/;

export async function extractInvoiceNumber(locator) {
  const text = (await locator.textContent()) ?? '';
  return text.match(INVOICE_PATTERN)?.[0] ?? null;
}
