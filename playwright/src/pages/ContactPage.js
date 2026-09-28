import { BasePage } from './BasePage.js';

export class ContactPage extends BasePage {
  constructor(page) {
    super(page);
    this.firstName = this.dt('first-name');
    this.lastName = this.dt('last-name');
    this.email = this.dt('email');
    this.subject = this.dt('subject');
    this.message = this.dt('message');
    this.attachment = this.dt('attachment');
    this.submitButton = this.dt('contact-submit');
    // The success alert has no data-test hook and only exists after submit - the whole
    // form is replaced by it, so the role is unique on the page at that point.
    this.successMessage = this.page.getByRole('alert');
  }

  async open() {
    await this.page.goto('/contact');
    await this.firstName.waitFor();
  }

  async fill(details) {
    await this.firstName.fill(details.firstName);
    await this.lastName.fill(details.lastName);
    await this.email.fill(details.email);
    await this.subject.selectOption(details.subject);
    await this.message.fill(details.message);
  }

  async attach(filePath) {
    await this.attachment.setInputFiles(filePath);
  }

  async submit() {
    await this.submitButton.click();
  }
}
