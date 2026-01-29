import { test, expect } from '@playwright/test'
import { captureSnapshot, compareSnapshots } from 'computed-styles-regression-test'

test.describe('Attribute Filtering', () => {
  test('should exclude attributes using excludeAttributes option', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="https://twitter.com/widget?sessionId=abc123"></iframe>
          <div>Content</div>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    // Change the sessionId
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="https://twitter.com/widget?sessionId=xyz789"></iframe>
          <div>Content</div>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Without filter, should detect difference
    const resultWithoutFilter = compareSnapshots(snapshot1, snapshot2)
    expect(resultWithoutFilter.isEqual).toBe(false)

    // With excludeAttributes, should ignore the difference
    const resultWithFilter = compareSnapshots(snapshot1, snapshot2, {
      excludeAttributes: ['src'],
    })
    expect(resultWithFilter.isEqual).toBe(true)
  })

  test('should exclude href attributes', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <a href="https://support.zendesk.com/hc/123e4567-e89b-12d3-a456-426614174000">Support</a>
          <div>Content</div>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    // Change the UUID
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <a href="https://support.zendesk.com/hc/987fcdeb-51a2-43f7-8901-234567890abc">Support</a>
          <div>Content</div>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Without filter, should detect difference
    const resultWithoutFilter = compareSnapshots(snapshot1, snapshot2)
    expect(resultWithoutFilter.isEqual).toBe(false)

    // With excludeAttributes for href, should ignore the difference
    const resultWithFilter = compareSnapshots(snapshot1, snapshot2, {
      excludeAttributes: ['href'],
    })
    expect(resultWithFilter.isEqual).toBe(true)
  })

  test('should handle multiple excluded attributes', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="https://twitter.com/widget?sessionId=abc123"></iframe>
          <script src="/_next/static/chunks/main-28c666f33c27c6bf.js"></script>
          <img src="https://ads.example.com/pixel?pid=user123&btt=token456" />
          <div>Content</div>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    // Change all dynamic values
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="https://twitter.com/widget?sessionId=xyz789"></iframe>
          <script src="/_next/static/chunks/main-ff49ccb699a7e46a.js"></script>
          <img src="https://ads.example.com/pixel?pid=user999&btt=token888" />
          <div>Content</div>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // With excludeAttributes for src, should ignore all src differences
    const result = compareSnapshots(snapshot1, snapshot2, {
      excludeAttributes: ['src'],
    })

    expect(result.isEqual).toBe(true)
  })

  test('should exclude attributes at capture time', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-token="secret123" data-session="abc">Content</div>
        </body>
      </html>
    `)

    // Exclude sensitive attributes at capture time
    const snapshot = await captureSnapshot(page, {
      excludeAttributes: ['data-token'],
    })

    // Verify that data-token is not in the snapshot
    const divElement = snapshot.trees[0].children.find(
      (child) => child.nodeName === 'DIV'
    )

    expect(divElement).toBeDefined()
    expect(divElement?.attributes['data-token']).toBeUndefined()
    expect(divElement?.attributes['data-session']).toBe('abc')
  })

  test('should still detect real differences', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="https://twitter.com/widget?sessionId=abc123"></iframe>
          <div style="color: red;">Content</div>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    // Change both src (should be ignored) and style (should be detected)
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <iframe src="https://twitter.com/widget?sessionId=xyz789"></iframe>
          <div style="color: blue;">Content</div>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Even with excludeAttributes, should still detect the style change
    const result = compareSnapshots(snapshot1, snapshot2, {
      excludeAttributes: ['src'],
    })

    expect(result.isEqual).toBe(false)
    expect(result.differences.length).toBeGreaterThan(0)

    // Verify the difference is about styles, not iframe src
    const srcDiff = result.differences.find(d => d.path.includes('src'))
    expect(srcDiff).toBeUndefined()
  })

  test('should exclude attributes using function predicate', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-session="abc123" data-user="user456" id="main">Content</div>
          <img data-token="secret" src="image.jpg" alt="image" />
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    // Change all data-* attributes
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-session="xyz789" data-user="user999" id="main">Content</div>
          <img data-token="newsecret" src="image.jpg" alt="image" />
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Without filter, should detect difference
    const resultWithoutFilter = compareSnapshots(snapshot1, snapshot2)
    expect(resultWithoutFilter.isEqual).toBe(false)

    // With function predicate to exclude all data-* attributes
    const resultWithFilter = compareSnapshots(snapshot1, snapshot2, {
      excludeAttributes: (name) => name.startsWith('data-'),
    })
    expect(resultWithFilter.isEqual).toBe(true)
  })

  test('should exclude attributes using complex function predicate', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <a href="https://example.com" data-track="123" aria-label="Link">Link</a>
          <div src="test.jpg" data-id="456">Content</div>
        </body>
      </html>
    `)

    const snapshot1 = await captureSnapshot(page)

    // Change href, src, and data-* attributes
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <a href="https://different.com" data-track="789" aria-label="Link">Link</a>
          <div src="other.jpg" data-id="999">Content</div>
        </body>
      </html>
    `)

    const snapshot2 = await captureSnapshot(page)

    // Exclude using regex pattern
    const result = compareSnapshots(snapshot1, snapshot2, {
      excludeAttributes: (name) => /^(data-|src|href)/.test(name),
    })

    expect(result.isEqual).toBe(true)
  })

  test('should exclude attributes at capture time using function', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div data-token="secret123" data-session="abc" aria-label="Content">Content</div>
        </body>
      </html>
    `)

    // Exclude all data-* attributes at capture time
    const snapshot = await captureSnapshot(page, {
      excludeAttributes: (name) => name.startsWith('data-'),
    })

    const divElement = snapshot.trees[0].children.find(
      (child) => child.nodeName === 'DIV'
    )

    expect(divElement).toBeDefined()
    expect(divElement?.attributes['data-token']).toBeUndefined()
    expect(divElement?.attributes['data-session']).toBeUndefined()
    expect(divElement?.attributes['aria-label']).toBe('Content')
  })
})
