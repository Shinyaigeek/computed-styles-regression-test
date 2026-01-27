# Computed Styles Regression Test 📷

VisualRT is flaky...but Computed Styles is steady!
This is playwright based utility module to compare compare computed stylesheets(including psedue elements!) of selected DOM Node's and it's ancestors.

## Usage 💻

```ts
import { expect, test } from "@playwright/test";
import { captureSnapshot, compareSnapshots } from "computed-styles-regression-test";

test.describe("~~~", () => {
    test("~~~", async ({ page }) => {
        await page.goto("your page");

        const expectSnapshot = await captureSnapshot(page);

        await page.goto("your page to check");
        const actualSnapshot = await captureSnapshot(page);

        const result = await compareSnapshots(expectSnapshot, actualSnapshot);

        expect(result.isEqual).toBeTruthy();
    })
})
```

snapshot(returned by `captureSnapshot`) is just a serializable object, so you can save it with `fs.writeFile` and restore previous snapshot with `fs.readFile` & `JSON.stringify`.

If you want to watch differences between two snapshots, you can view it via `result.differences`.

## Filtering Dynamic Content

Exclude irrelevant elements and dynamic attributes from snapshots.

### Exclude Elements

```ts
// Exclude <script> tags (irrelevant to styles)
const snapshot = await captureSnapshot(page, {
  excludeElements: ['script', 'noscript']
});

const result = compareSnapshots(expected, actual, {
  excludeElements: ['script', 'meta']
});
```

### Exclude Attributes

```ts
// Ignore specific attributes
const result = compareSnapshots(expected, actual, {
  excludeAttributes: ['src', 'href']
});

// Exclude sensitive data from snapshots
const snapshot = await captureSnapshot(page, {
  excludeAttributes: ['data-token', 'data-session-id']
});
```