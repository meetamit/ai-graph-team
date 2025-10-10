import { GraphPage } from './pages/graph';
import { test, expect } from '@playwright/test';
import { format } from 'date-fns';

const testTitle = `Test Title ${format(new Date(), 'MM-dd-yyyy HH:mm:ss')}`;

test.describe('graph activity', () => {
  let graphPage: GraphPage;

  test.beforeEach(async ({ page }) => {
    graphPage = new GraphPage(page);
  });

  test('create, list, load and delete a new graph', async ({ page }) => {
    await graphPage.createNewGraph();
    await graphPage.isSubmitDisabled();
    await graphPage.setGraphTitle(testTitle);
    await graphPage.isSubmitEnabled();
    await graphPage.submitGraph();

    const graphData = await graphPage.getNewGraphData()
    const graphUrl = `/graph/${graphData.id}`
    await page.waitForURL(graphUrl);
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
});