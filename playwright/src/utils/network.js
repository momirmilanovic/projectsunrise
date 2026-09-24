export function waitForCartWrite(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/carts') && response.request().method() !== 'GET' && response.ok(),
  );
}

export function waitForCartDelete(page) {
  return page.waitForResponse(
    (response) => response.url().includes('/carts') && response.request().method() === 'DELETE',
  );
}

export function waitForProductQuery(page) {
  // Category/brand filters hit /products with a plain GET, but text search hits
  // /products/search using the HTTP QUERY method (confirmed via its
  // "accept-query" response header) - both need to be matched here.
  return page.waitForResponse(
    (response) =>
      response.url().includes('/products') &&
      ['GET', 'QUERY'].includes(response.request().method()) &&
      response.ok(),
  );
}
