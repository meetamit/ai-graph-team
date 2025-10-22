import { GraphPage } from './pages/graph';
import { test, expect } from '@playwright/test';
import { format } from 'date-fns';

test.describe('graph activity', () => {
  let graphPage: GraphPage;

  test.beforeEach(async ({ page }) => {
    graphPage = new GraphPage(page);
  });

  test('create, list, load and delete a new graph', async ({ page }) => {
    const testTitle = `Test Title 1 — ${format(new Date(), 'MM-dd-yyyy HH:mm:ss')}`;
    const graphData = await graphPage.createNewGraph(testTitle);

    const graphUrl = `/graph/${graphData.id}`;
    await expect(page).toHaveURL(graphUrl);

    await graphPage.listGraphs()
    await graphPage.isGraphListed(testTitle)

    await graphPage.loadListedGraph(testTitle)
    await page.waitForURL(graphUrl);
    await expect(page).toHaveURL(graphUrl);

    await graphPage.deleteGraph(testTitle)
    await page.waitForURL('/graph');
    await expect(page).toHaveURL('/graph');
    await graphPage.isGraphNotListed(testTitle)
  });

  test('create, run and reload a graph', async ({ page }) => {
    const testTitle = `Test Title 2 — ${format(new Date(), 'MM-dd-yyyy HH:mm:ss')}`;
    await graphPage.createNewGraph(testTitle);
    await graphPage.runGraph(testTitle);
    await graphPage.expectNodeStatuses({
      user_input: 'awaiting',
      position_for: 'pending',
      position_against: 'pending',
      judge: 'pending',
    });

    // Verify that the input form is rendered with the expected structure
    await expect(await graphPage.isInputFormVisible()).toBe(true);
    await expect(await graphPage.getInputFormTitle()).toBe('Required Inputs');
    const inputFields = await graphPage.getInputFields();
    expect(inputFields).toEqual([
      { name: 'user_input_1', prompt: 'Question 1', default: 'Default 1' },
      { name: 'user_input_2', prompt: 'Question 2', default: 'Default 2' },
    ]);

    // Fill in the input values
    await graphPage.fillInputField('user_input_1', 'Test answer 1');
    await graphPage.fillInputField('user_input_2', 'Test answer 2');
    
    // Submit the form
    await graphPage.submitInputForm();

    await graphPage.expectNodeStatuses({
      user_input:       expect.stringMatching(/pending|running|done/),
      position_for:     expect.stringMatching(/pending|running|done/),
      position_against: expect.stringMatching(/pending|running|done/),
      judge:            expect.stringMatching(/pending|running/),
    })
    await graphPage.expectNodeStatuses({
      user_input: 'done',
      position_for: 'done',
      position_against: 'done',
      judge: 'done',
    });
  });
});