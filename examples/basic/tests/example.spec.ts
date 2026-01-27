import { expect, test } from "@playwright/test";
import { captureSnapshot, compareSnapshots } from "computed-styles-regression-test";

test.describe('Example', () => {
  test('should be able to navigate to the page', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');

    const expectSnapshot = await captureSnapshot(page);

    await page.goto('http://localhost:8080/diff.html');

    const actualSnapshot = await captureSnapshot(page);

    const result = await compareSnapshots(expectSnapshot, actualSnapshot);

    expect(JSON.stringify(result)).toMatchSnapshot("result.json");
  });
});