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

You can use either an array of element names or a function predicate:

```ts
// Using array - Exclude specific element types
const snapshot = await captureSnapshot(page, {
  excludeElements: ['script', 'noscript']
});

const result = compareSnapshots(expected, actual, {
  excludeElements: ['script', 'meta']
});

// Using function - More flexible filtering
const snapshot = await captureSnapshot(page, {
  excludeElements: (tagName) => tagName.toLowerCase() === 'script'
});

// Using regex pattern
const result = compareSnapshots(expected, actual, {
  excludeElements: (tagName) => /^(script|noscript|style)$/i.test(tagName)
});
```

### Exclude Attributes

You can use either an array of attribute names or a function predicate:

```ts
// Ignore specific attributes
const result = compareSnapshots(expected, actual, {
  excludeAttributes: ['src', 'href']
});

// Exclude sensitive data from snapshots
const snapshot = await captureSnapshot(page, {
  excludeAttributes: ['data-token', 'data-session-id']
});

// Using function - Exclude all data-* attributes
const snapshot = await captureSnapshot(page, {
  excludeAttributes: (name) => name.startsWith('data-')
});

// Using regex - Exclude multiple patterns
const result = compareSnapshots(expected, actual, {
  excludeAttributes: (name) => /^(data-|aria-|src|href)/.test(name)
});
```

### Combining Filters

You can combine element and attribute filters:

```ts
const result = compareSnapshots(expected, actual, {
  excludeElements: (tagName) => tagName.toLowerCase() === 'script',
  excludeAttributes: (name) => name.startsWith('data-') || name === 'src'
});
```