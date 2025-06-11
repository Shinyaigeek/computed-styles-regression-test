import { test, expect } from '@playwright/test'
import { captureSnapshot } from 'cssom-regression-test'

test.describe('Snapshot', () => {
  const targets = ['basic-layout.html', 'flexbox-grid.html']

  for (const target of targets) {
    test(`should capture snapshot for ${target}`, async ({ page }) => {
      await page.goto(`http://localhost:8080/${target}`)
      await page.waitForLoadState('networkidle')

      const snapshot = await captureSnapshot(page)

      expect(JSON.stringify(snapshot)).toMatchSnapshot(`${target}.json`)
    })
  }
})
