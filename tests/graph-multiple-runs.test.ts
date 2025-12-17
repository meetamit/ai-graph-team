import { GraphPage } from './pages/graph';
import { test, expect } from '@playwright/test';
import { format } from 'date-fns';
import type { GraphJSON } from '@/lib/graph-schema';

test.describe('graph multiple runs with image generation', () => {
  let graphPage: GraphPage;
  let graphId: string;

  test('run graph with incrementally added image generators and verify run history', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    graphPage = new GraphPage(page);
    graphPage.runWithTestModel('imageGen');

    const testTitle = `Multi-Image Test — ${format(new Date(), 'MM-dd-yyyy HH:mm:ss')}`;
    
    // Create graph with IMAGE_GRAPH template
    const graphData = await graphPage.createNewGraph(testTitle, createGraphWithNImageGenerators(1));
    graphId = graphData.id;

    // ===== Run 1: Single image generator =====
    await graphPage.runGraph();
    await graphPage.expectNodeStatuses({
      user_input: 'awaiting',
      image_generator_1: 'pending',
    });

    await graphPage.fillInputField('prompt', 'First run prompt');
    await graphPage.submitInputForm();

    await graphPage.expectNodeStatuses({
      user_input: 'done',
      image_generator_1: 'done',
    });

    // ===== Add 2nd image generator node via text editor =====
    const graphWith2Generators = createGraphWithNImageGenerators(2);
    await graphPage.openTextEditor();
    await graphPage.updateGraphViaTextEditor(graphWith2Generators);
    await graphPage.waitForGraphSave();

    // ===== Run 2: Two image generators =====
    await graphPage.runGraph();
    await graphPage.expectNodeStatuses({
      user_input: 'awaiting',
      image_generator_1: 'pending',
      image_generator_2: 'pending',
    });

    await graphPage.fillInputField('prompt', 'Second run prompt');
    await graphPage.submitInputForm();

    await graphPage.expectNodeStatuses({
      user_input: 'done',
      image_generator_1: 'done',
      image_generator_2: 'done',
    });

    // ===== Add 3rd image generator node via text editor =====
    const graphWith3Generators = createGraphWithNImageGenerators(3);
    await graphPage.updateGraphViaTextEditor(graphWith3Generators);
    await graphPage.waitForGraphSave();

    // ===== Run 3: Three image generators =====
    await graphPage.runGraph();
    await graphPage.expectNodeStatuses({
      user_input: 'awaiting',
      image_generator_1: 'pending',
      image_generator_2: 'pending',
      image_generator_3: 'pending',
    });

    await graphPage.fillInputField('prompt', 'Third run prompt');
    await graphPage.submitInputForm();

    await graphPage.expectNodeStatuses({
      user_input: 'done',
      image_generator_1: 'done',
      image_generator_2: 'done',
      image_generator_3: 'done',
    });

    // ===== Navigate to runs list and verify all 3 runs are present =====
    await page.goto(`/graph/${graphId}/run`);
    
    // Wait for the runs list to load
    await expect(page.locator('ul li')).toHaveCount(3, { timeout: 5000 });
    
    // Verify all 3 runs are listed
    const runLinks = page.locator('ul li a.font-mono');
    await expect(runLinks).toHaveCount(3);

    // Get the run IDs (they are listed newest first, so 2nd run is at index 1)
    const runIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const runId = await runLinks.nth(i).textContent();
      runIds.push(runId!);
    }

    // Click on the 2nd run (middle one - index 1, which had 2 image generators)
    await runLinks.nth(1).click();
    await page.waitForURL(`/graph/${graphId}/run/${runIds[1]}`);

    // Verify that exactly 2 images are displayed in the graph
    const images = page.locator('img[alt$=".png"]');
    await expect(images).toHaveCount(2, { timeout: 10000 });
  });
});

// Helper function to create a graph with N image generators
function createGraphWithNImageGenerators(n: number): GraphJSON {
  const fileSchema = {
    type: "object",
    properties: {
      id: { type: "string", description: "The id of the file" },
      uri: { type: "string", description: "The URI of the file" },
      filename: { type: "string", description: "The filename of the file" },
      mediaType: { type: "string", description: "The media type of the file" },
    },
    required: ["id", "uri", "filename", "mediaType"]
  };

  const nodes: GraphJSON['nodes'] = [
    {
      id: "user_input",
      type: "input",
      name: "User Input",
      intent: "Collect the user's image prompt.",
      instructions: [
        'You are a helpful receptionist to a service that generates images based on user requests. The user request may be zero or more pieces of information, which you distill them into a single, clear, and concise image prompt. If necessary (e.g. when zero information is provided in the initial request), use the available tools to ask the user for more information.',
        '## User Input: {{prompt != null ? prompt : "No input provided"}}',
      ],
      output_schema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "The image prompt" },
          special_instructions: { type: "string", description: "Any special instructions for the image generation" }
        },
        required: ["prompt"]
      }
    },
  ];

  const edges: GraphJSON['edges'] = [];
  const layouts: Record<string, { x: number; y: number }> = {
    user_input: { x: 250, y: 20 },
  };

  // Add N image generator nodes
  for (let i = 1; i <= n; i++) {
    const nodeId = `image_generator_${i}`;
    nodes.push({
      id: nodeId,
      type: "llm",
      name: `Imager ${i}`,
      intent: "Generate an provided prompt.",
      output_schema: {
        type: "object",
        properties: { file: fileSchema }
      },
      tools: ['generateImage'],
    });
    
    edges.push({ from: "user_input", to: nodeId });
    layouts[nodeId] = { x: 100 + (i * 200), y: 250 };
  }

  return { nodes, edges, layouts };
}

