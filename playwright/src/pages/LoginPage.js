import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.form = this.dt('login-form');
    this.email = this.dt('email');
    this.password = this.dt('password');
    this.submit = this.dt('login-submit');
  }

  async open() {
    await this.page.goto('/auth/login');
    await this.form.waitFor();
  }

  async signIn(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    const loggedIn = this.page.waitForResponse(
      (response) =>
        response.url().includes('/users/login') && response.request().method() === 'POST',
    );
    await this.submit.click();
    const response = await loggedIn;
    if (!response.ok()) {
      throw new Error(`Sign in for ${email} failed with HTTP ${response.status()}`);
    }
    await this.page.waitForURL((url) => !url.pathname.includes('/auth/login'));
  }
}
