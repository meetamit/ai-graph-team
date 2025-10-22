import { expect, Page } from '@playwright/test';
import { Graph } from '@/lib/db/schema';
import { NodeId, NodeStatus, NodeStatuses } from '@/lib/graphSchema';

export class GraphPage {
  constructor(private page: Page) {}

  async createNewGraph(title: string): Promise<Graph> {
    await this.page.goto('/graph/new');
    await this.isSubmitDisabled();
    await this.setGraphTitle(title);
    await this.isSubmitEnabled();
    await this.submitGraph();
    const graphData = await this.captureNewGraphData()
    await this.page.waitForURL(`/graph/${graphData.id}`);
    return graphData
  }
  async captureNewGraphData(): Promise<Graph> {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/graph'),
    );
    return await response.json() as Graph;
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
  async deleteGraph(title: string) {
    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await this.getDeleteButton().click();
  }

  async runGraph(title: string) {
    await this.getRunButton().click();
  }
  async expectNodeStatuses(expected: any, timeout = 10_000): Promise<void> {
    await expect
      .poll(() => this.collectNodeStatuses(), { timeout })
      .toMatchObject(expected);
  }
  async collectNodeStatuses(): Promise<NodeStatuses> {
    return await this.page.$$eval('[data-gnid]', (els) => {
      const entries = Array.from(els).map((el) => {
        const id: NodeId =
          (el as HTMLElement).dataset.gnid ||
          (el.getAttribute('data-gnid') || '') as NodeId;

        const cls = (el.getAttribute('class') || '').split(/\s+/);
        const statusClass = cls.find((c) => c.startsWith('node-status-'));
        const status: NodeStatus = statusClass?.replace('node-status-', '') as NodeStatus;
        return [id, status];
      });
      return Object.fromEntries(entries) as NodeStatuses;
    });  
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
  getRunButton() {
    return this.page.getByRole('button', { name: 'Run' });
  }
  getListedGraphLink(title: string) {
    return this.page.getByRole('link', { name: title });
  }

  // Graph input form methods
  async isInputFormVisible(): Promise<boolean> {
    return await this.page.locator('[data-testid="graph-input-form"]').isVisible();
  }

  async getInputFormTitle(): Promise<string> {
    return await this.page.locator('[data-testid="graph-input-form"] h2').textContent() || '';
  }

  async getInputFields(): Promise<Array<{name: string, prompt: string, default?: string}>> {
    return await this.page.$$eval('[data-testid="graph-input-form"] [data-testid="input-field"]', (fields) => {
      return fields.map(field => {
        const name = field.getAttribute('data-input-name') || '';
        const prompt = field.querySelector('label')?.textContent || '';
        const defaultText = field.querySelector('input')?.placeholder || '';
        const defaultMatch = defaultText.match(/Default: (.+)/);
        return {
          name,
          prompt,
          default: defaultMatch ? defaultMatch[1] : undefined
        };
      });
    });
  }

  async fillInputField(name: string, value: string): Promise<void> {
    await this.page.locator(`[data-testid="graph-input-form"] input[name="${name}"]`).fill(value);
  }

  async submitInputForm(): Promise<void> {
    await this.page.locator('[data-testid="graph-input-form"] button[type="submit"]').click();
  }

  async cancelInputForm(): Promise<void> {
    await this.page.locator('[data-testid="graph-input-form"] button[type="button"]').click();
  }
}
