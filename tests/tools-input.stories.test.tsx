import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const STORYBOOK_BASE_URL = process.env.STORYBOOK_BASE_URL ?? 'http://localhost:6006';

function storyUrl(id: string) {
  return `${STORYBOOK_BASE_URL}/iframe.html?id=${id}`;
}

test.describe('ToolEditorModal stories', () => {
  let storyPage: ToolInputStoryPage;
  test.beforeEach(async ({ page }) => {
    storyPage = new ToolInputStoryPage(page);
  });

  test('WriteFileTool renders expected fields', async ({ page }) => {
    test.setTimeout(3000)
    await page.goto(storyUrl('graph-toolsinput--configured-tools'));

    // Start adding generateImage tool
    await storyPage.addTool('Generate Image');
    // Try to cancel the edit via outside click and verify that it works (because there is no change)
    await storyPage.cancelEditViaOutsideClick(true);

    // Again add the generateImage tool and configure it
    await storyPage.addTool('Generate Image');

    // Verify the placeholder for the filename field
    await storyPage.isFieldPlaceholder('filename', 'Defaults to "generated-image.png"');
    await storyPage.isFieldPlaceholder('prompt', 'Defaults to "undefined"');
    await storyPage.isComboBoxPlaceholder('size', 'Defaults to "512x512"');

    // Verify that style and quality are not visible yet, because dall-e-3 isn't selected yet
    expect(await storyPage.getComboBox('style')).not.toBeVisible();
    expect(await storyPage.getComboBox('quality')).not.toBeVisible();

    // Select a new model and verify that style and quality are now visible as a result
    await storyPage.selectFieldValue('model', 'dall-e-3');
    expect(await storyPage.getComboBox('style')).toBeVisible();
    expect(await storyPage.getComboBox('quality')).toBeVisible();

    // Fill in the filename field and save the tool
    await storyPage.fillField('filename', 'test-file.txt');
    await storyPage.saveEdit('Add');
    expect(await storyPage.getToolButton('Generate Image')).toBeVisible();

    // Click to edit the newly added tool and verify that fields set before have been retained
    await storyPage.editTool('Generate Image');
    expect(await storyPage.getComboBox('model')).toHaveText('dall-e-3');
    expect(await storyPage.getInputField('filename')).toHaveValue('test-file.txt');

    // Modify a field but then cancel the edit and verify that the original values are retained
    await storyPage.fillField('filename', 'test-file-2.txt');

    // Try to cancel the edit via outside click and verify that it doesn't work (because there is a change)
    await storyPage.cancelEditViaOutsideClick(false);

    // Cancel the edit via the cancel butto and verify that it works
    await storyPage.cancelEdit();
    await storyPage.editTool('Generate Image');
    expect(await storyPage.getInputField('filename')).toHaveValue('test-file.txt');

    // Modify a field and then save the edit and verify that the new value is retained
    await storyPage.fillField('filename', 'test-file-3.txt');
    await storyPage.saveEdit();
    await storyPage.editTool('Generate Image');
    expect(await storyPage.getInputField('filename')).toHaveValue('test-file-3.txt');

    // Edit the default value for size and verify that the new value is reflected in the placeholder
    await storyPage.switchMode('model', 'Prompted'); // Do this one just as a feint)
    await storyPage.switchMode('size', 'Prompted');
    await storyPage.selectFieldValue('size', 'default', '1024x1792');
    await storyPage.switchMode('size', 'Given');
    await storyPage.isComboBoxPlaceholder('size', 'Defaults to "1024x1792"');

    // Delete the tool and verify that it is no longer visible
    await storyPage.deleteToolViaCurrentDialog();
    expect(await storyPage.getToolButton('Generate Image')).not.toBeVisible();
  });
});



class ToolInputStoryPage {
  constructor(private page: Page) {}

  getToolButton(toolName: string) {
    return this.page.getByRole('button', { name: toolName })
  }
  getFieldGroup(name: string) {
    return this.page.getByRole('group', { name })
  }
  getComboBox(name: string, subfield?: string) {
    return this.getFieldGroup(name).getByRole('combobox', { name: subfield })
  }
  getInputField(name: string) {
    return this.page.getByRole('textbox', { name })
  }

  async isFieldPlaceholder(name: string, placeholder: string) {
    await expect(await this.getInputField(name)).toHaveAttribute('placeholder', placeholder);
  }
  async isComboBoxPlaceholder(name: string, placeholder: string) {
    await expect(this.getComboBox(name)).toHaveText(placeholder);
  }


  async editTool(toolName: string) {
    await this.getToolButton(toolName).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
    await expect(this.page.getByText(`Edit Tool: ${toolName}`)).toBeVisible();
  }

  async saveEdit(buttonName: string = 'Save') {
    await this.page.getByRole('button', { name: buttonName }).click();
    await expect(this.page.getByRole('dialog')).not.toBeVisible();
  }

  async cancelEdit() {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.page.getByRole('dialog')).not.toBeVisible();
  }
  async cancelEditViaOutsideClick(expectItToWork: boolean = true) {
    await this.page.mouse.down();
    if (expectItToWork) {
      await expect(this.page.getByRole('dialog')).not.toBeVisible();
    } else {
      await this.page.waitForTimeout(50);
      await expect(this.page.getByRole('dialog')).toBeVisible();
    }
  }

  async deleteToolViaCurrentDialog() {
    await this.page.getByRole('button', { name: 'Remove tool' }).click();
    await expect(this.page.getByRole('dialog')).not.toBeVisible();
  }

  async addTool(toolName: string) {
    await expect(this.page.getByRole('dialog')).not.toBeVisible();
    const addToolButton = this.page.getByTitle('Add tool');
    await expect(addToolButton).toBeVisible();
    await addToolButton.click();
    await this.page.getByText(toolName).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
    await expect(this.page.getByText(`Add Tool: ${toolName}`)).toBeVisible();
  }

  async fillField(name: string, value: string) {
    const fieldInput = this.getInputField(name)
    await fieldInput.click()
    await fieldInput.fill(value)
  }

  async selectFieldValue(name: string, value: string, maybeValue?: string) {
    let subfield: string | undefined = undefined;
    if (maybeValue !== undefined) {
      subfield = value;
      value = maybeValue;
    }
      
    await this.getComboBox(name, subfield).click()
    await this.page.getByRole('option', { name: value }).click()
  }

  async switchMode(name: string, mode: string) {
    await this.getFieldGroup(name).getByRole('radio', { name: mode }).click();
  }
}
