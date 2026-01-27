import { test, expect } from '@playwright/test'
import { captureSnapshot, compareSnapshots } from 'computed-styles-regression-test'

test.describe('Exclude Elements', () => {
  test('should exclude script tags from snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div>Content</div>
          <script src="app.js"></script>
          <script>console.log('test')</script>
        </body>
      </html>
    `)

    const snapshot = await captureSnapshot(page, {
      excludeElements: ['script']
    })

    // Verify that script tags are not in the snapshot
    const bodyElement = snapshot.trees[0]
    const scriptElements = bodyElement.children.filter(
      (child) => child.nodeName === 'SCRIPT'
    )

    expect(scriptElements).toHaveLength(0)
  })

  test('should exclude multiple element types', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="description" content="test">
        </head>
        <body>
          <div>Content</div>
          <script src="app.js"></script>
          <noscript>Please enable JavaScript</noscript>
        </body>
      </html>
    `)

    const snapshot = await captureSnapshot(page, {
      excludeElements: ['script', 'noscript', 'meta']
    })

    const bodyElement = snapshot.trees[0]

    const excludedElements = bodyElement.children.filter(
      (child) => ['SCRIPT', 'NOSCRIPT', 'META'].includes(child.nodeName)
    )

    expect(excludedElements).toHaveLength(0)
  })

  test('should ignore script tag changes when excluded at comparison time', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div>Content</div>
          <script src="app-v1.js"></script>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div>Content</div>
          <script src="app-v2.js"></script>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Without exclusion, should detect difference
    const resultWithoutFilter = compareSnapshots(snapshot1, snapshot2)
    expect(resultWithoutFilter.isEqual).toBe(false)

    // With script exclusion, should ignore the difference
    const resultWithFilter = compareSnapshots(snapshot1, snapshot2, {
      excludeElements: ['script']
    })
    expect(resultWithFilter.isEqual).toBe(true)
  })

  test('should exclude nested script tags', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div>
            <p>Text</p>
            <script src="nested.js"></script>
          </div>
        </body>
      </html>
    `)

    const snapshot = await captureSnapshot(page, {
      excludeElements: ['script']
    })

    // Find the div element
    const bodyElement = snapshot.trees[0]
    const divElement = bodyElement.children.find(
      (child) => child.nodeName === 'DIV'
    )

    expect(divElement).toBeDefined()

    // Verify nested script is excluded
    const nestedScript = divElement?.children.find(
      (child) => child.nodeName === 'SCRIPT'
    )
    expect(nestedScript).toBeUndefined()
  })

  test('should still detect real differences when excluding scripts', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <script src="app.js"></script>
          <div style="color: red;">Content</div>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    // Change both script and div style
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <script src="app-v2.js"></script>
          <div style="color: blue;">Content</div>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Even with script exclusion, should detect the style change
    const result = compareSnapshots(snapshot1, snapshot2, {
      excludeElements: ['script']
    })

    expect(result.isEqual).toBe(false)
    expect(result.differences.length).toBeGreaterThan(0)

    // Verify no script-related differences
    const scriptDiff = result.differences.find(d =>
      d.path.toLowerCase().includes('script')
    )
    expect(scriptDiff).toBeUndefined()
  })

  test('should handle case-insensitive element names', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div>Content</div>
          <SCRIPT src="app.js"></SCRIPT>
        </body>
      </html>
    `)

    // Element names in excludeElements should be case-insensitive
    const snapshot = await captureSnapshot(page, {
      excludeElements: ['script']  // lowercase
    })

    const bodyElement = snapshot.trees[0]
    const scriptElements = bodyElement.children.filter(
      (child) => child.nodeName === 'SCRIPT'
    )

    expect(scriptElements).toHaveLength(0)
  })

  test('should work with excludeAttributes together', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-session="abc123">Content</div>
          <script src="app.js"></script>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-session="xyz789">Content</div>
          <script src="app-v2.js"></script>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Exclude both script elements and data-session attribute
    const result = compareSnapshots(snapshot1, snapshot2, {
      excludeElements: ['script'],
      excludeAttributes: ['data-session']
    })

    expect(result.isEqual).toBe(true)
  })
})
