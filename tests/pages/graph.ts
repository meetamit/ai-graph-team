import { expect, Page } from '@playwright/test';

export class GraphPage {
  constructor(private page: Page) {}

  async createNewGraph() {
    await this.page.goto('/graph/new');
  }
  async setGraphTitle(title: string) {
    await this.page.getByPlaceholder('Title').click();
    await this.page.getByPlaceholder('Title').fill(title);
  }
  async isSubmitEnabled() {
    await expect(this.getSubmitButton()).toBeEnabled();
  }
  async isSubmitDisabled() {
    await expect(this.getSubmitButton()).toBeDisabled();
  }
  async submitGraph() {
    await this.getSubmitButton().click();
  }
  async getNewGraphData() {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/graph'),
    );
    return await response.json()
  }
  async deleteGraph(title: string) {
    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await this.getDeleteButton().click();
  }

  async listGraphs() {
    await this.page.goto('/graph')
  }
  async isGraphListed(title: string) {
    await expect(this.getListedGraphLink(title)).toBeVisible();
  }
  async isGraphNotListed(title: string) {
    await expect(this.getListedGraphLink(title)).not.toBeVisible();
  }
  async loadListedGraph(title: string) {
    await this.getListedGraphLink(title).click();
  }

  getSubmitButton() {
    return this.page.getByRole('button', { name: 'Create Graph' });
  }
  getDeleteButton() {
    return this.page.getByRole('button', { name: 'Delete' });
  }
  getListedGraphLink(title: string) {
    return this.page.getByRole('link', { name: title });
  }
}
