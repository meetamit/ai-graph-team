import { expect, Page } from '@playwright/test';
import { Graph } from '@/lib/db/schema';
import { GraphJSON, NodeId, NodeStatus, NodeStatuses } from '@/lib/graph-schema';

export class GraphPage {
  constructor(private page: Page) {}

  async createNewGraph(title: string, graphData?: GraphJSON): Promise<Graph> {
    await this.page.goto('/graph/new');
    await this.isSubmitDisabled();
    await this.fillGraphTitle(title);
    if (graphData) { await this.fillGraphData(graphData); }
    await this.isSubmitEnabled();
    await this.submitGraph();
    const savedData = await this.captureNewGraphData()
    await this.page.waitForURL(`/graph/${savedData.id}`);
    return savedData
  }
  async runWithTestModel(model: string) {
    await this.page.route('**/api/graph/*/run', async (route, request) => {
      // Only add test model header for POST requests (running the graph)
      if (request.method() === 'POST') {
        await route.continue({
          headers: { ...(await request.allHeaders()), 'X-Test-Model': model },
        });
      } else {
        await route.continue();
      }
    });
  }
  async captureNewGraphData(): Promise<Graph> {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/graph'),
    );
    return await response.json() as Graph;
  }
  
  async fillGraphTitle(title: string) {
    await this.page.getByPlaceholder('Title').click();
    await this.page.getByPlaceholder('Title').fill(title);
  }
  async fillGraphData(graphData: GraphJSON) {
    await this.page.getByRole('button', { name: 'Edit as Text' }).click();

    const editor = this.page.locator('.cm-editor .cm-content[contenteditable="true"]');
    await expect(editor).toBeVisible();

    await editor.click();
    const json = JSON.stringify(graphData);
    await editor.fill(json);
    await expect(editor).toHaveText(json, { timeout: 2000 });
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
  async deleteGraph() {
    // Wait for the delete button to be visible and enabled before proceeding
    const deleteButton = this.getDeleteButton();
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toBeEnabled();
    
    // Set up dialog handler before clicking
    const dialogPromise = this.page.waitForEvent('dialog').then(dialog => dialog.accept());
    await deleteButton.click();
    // Wait for dialog to be accepted
    await dialogPromise;
    // Wait for the DELETE API call to complete
    await this.page.waitForResponse((response) =>
      response.url().includes('/api/graph') && response.request().method() === 'DELETE',
    );
    // Wait for navigation to complete
    await this.page.waitForURL('/graph');
  }

  async runGraph() {
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
    // Check that the graph is in the active list (not in the deleted section)
    // Active graphs are in the first ul (inside div.mt-4)
    const activeList = this.page.locator('section div.mt-4 ul').first();
    const graphLink = activeList.getByRole('link', { name: title, exact: true });
    await expect(graphLink).toBeVisible();
  }
  async isGraphNotListed(title: string) {
    // Check that the graph is not in the active list (it may be in the deleted section)
    // Active graphs are in the first ul (inside div.mt-4)
    const activeList = this.page.locator('section div.mt-4 ul').first();
    const graphLink = activeList.getByRole('link', { name: title, exact: true });
    await expect(graphLink).not.toBeVisible();
  }
  async isGraphInDeletedSection(title: string) {
    // Check that the graph is in the deleted section
    // Deleted graphs are in the ul inside div.mt-8 (which contains the "Deleted" heading)
    const deletedList = this.page.locator('section div.mt-8 ul').first();
    const graphLink = deletedList.getByRole('link', { name: title, exact: true });
    await expect(graphLink).toBeVisible();
  }
  async loadListedGraph(title: string) {
    await this.getListedGraphLink(title).click();
    // Wait for the graph page to load by waiting for a key element
    await this.page.waitForURL(/\/graph\/[^/]+$/);
    // Wait for the delete button to be ready (visible and enabled)
    const deleteButton = this.getDeleteButton();
    await expect(deleteButton).toBeVisible();
  }

  async cloneGraph(originalTitle: string, cloneTitle?: string): Promise<Graph> {
    // Find the link with exact title match, then get its parent li row
    const link = this.page.getByRole('link', { name: originalTitle, exact: true });
    const graphRow = link.locator('xpath=ancestor::li'); // Get parent li element
    await graphRow.hover();
    
    // Click the clone button (it should be visible on hover)
    const cloneButton = graphRow.locator('button[title="Clone graph"]');
    await expect(cloneButton).toBeVisible();
    await cloneButton.click();
    
    // Wait for dialog to appear
    const dialog = this.page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();
    
    // Update clone title if provided
    if (cloneTitle) {
      const input = dialog.getByPlaceholder('Graph title');
      await input.clear();
      await input.fill(cloneTitle);
    }
    
    // Click clone button in dialog
    const cloneDialogButton = dialog.getByRole('button', { name: 'Clone' });
    await cloneDialogButton.click();
    
    // Wait for navigation to the cloned graph
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/graph') && response.request().method() === 'POST',
    );
    const clonedGraph = await response.json() as Graph;
    await this.page.waitForURL(`/graph/${clonedGraph.id}`);
    return clonedGraph;
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
    return this.page.getByRole('link', { name: title, exact: true });
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

  // Text editor methods for modifying graph JSON
  async openTextEditor(): Promise<void> {
    const button = this.page.getByRole('button', { name: 'Edit as Text' });
    // Check if text editor is already open by looking for the editor
    const editor = this.page.locator('.cm-editor .cm-content[contenteditable="true"]');
    if (!(await editor.isVisible())) {
      await button.click();
      await expect(editor).toBeVisible();
    }
  }

  async updateGraphViaTextEditor(graphData: GraphJSON): Promise<void> {
    const editor = this.page.locator('.cm-editor .cm-content[contenteditable="true"]');
    await expect(editor).toBeVisible();

    await editor.click();
    // Select all and replace with new JSON
    await this.page.keyboard.press('ControlOrMeta+a');
    const json = JSON.stringify(graphData);
    // Input JSON via paste (ctrl+v), because it seems to be 1000x faster than either of the commented out methods:
    //     await editor.pressSequentially(json, { delay: 0 });
    //     await this.page.keyboard.type(json);
    await this.page.evaluate((json: string) => navigator.clipboard.writeText(json), json);
    await this.page.keyboard.press('ControlOrMeta+v');
  }

  async waitForGraphSave(): Promise<void> {
    // Wait for the save button to show "Saving..." and then back to "Save"
    const saveButton = this.page.getByRole('button', { name: 'Save' });
    // Give a moment for the debounce to trigger the save
    await this.page.waitForTimeout(500);
    // Wait for any "Saving..." state to complete
    await expect(saveButton).not.toHaveText('Saving...', { timeout: 5000 });
    await this.page.waitForTimeout(500);
  }
}
