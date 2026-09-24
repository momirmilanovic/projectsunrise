export async function clearSession(context) {
  await context.clearCookies();
  for (const page of context.pages()) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}
