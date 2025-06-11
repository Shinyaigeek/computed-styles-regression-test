import { test, expect } from '@playwright/test'
import assert from 'node:assert'
import { captureSnapshot, compareSnapshots, type CSSOMSnapshot } from 'cssom-regression-test'

test.describe('Basic Layout CSSOM Tests', () => {
  let baselineSnapshot: CSSOMSnapshot

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/basic-layout.html')
    await page.waitForLoadState('networkidle')
  })

  test('should capture baseline snapshot of container', async ({ page }) => {
    baselineSnapshot = await captureSnapshot(page, {
      selector: '.container',
    })

    expect(baselineSnapshot).toBeDefined()
    expect(baselineSnapshot.url).toContain('basic-layout.html')
    expect(baselineSnapshot.trees).toHaveLength(1)
    expect(baselineSnapshot.trees[0].nodeName).toBe('DIV')
  })

  test('should capture header element with correct styles', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.header',
    })

    expect(snapshot.trees).toHaveLength(1)
    const headerElement = snapshot.trees[0]

    expect(headerElement.nodeName).toBe('HEADER')
    expect(headerElement.attributes.class).toBe('header')

    // Check computed styles
    const bgColor = headerElement.computedStyles['background-color']
    const paddingBlockStart = headerElement.computedStyles['padding-block-start']
    const paddingBlockEnd = headerElement.computedStyles['padding-block-end']
    const paddingInlineStart = headerElement.computedStyles['padding-inline-start']
    const paddingInlineEnd = headerElement.computedStyles['padding-inline-end']
    const marginBottom = headerElement.computedStyles['margin-bottom']

    expect(bgColor).toBe('rgb(51, 51, 51)')
    expect(paddingBlockStart).toBe('15px')
    expect(paddingBlockEnd).toBe('15px')
    expect(paddingInlineStart).toBe('15px')
    expect(paddingInlineEnd).toBe('15px')
    expect(marginBottom).toBe('20px')
  })

  test('should capture navigation with multiple nav items', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.nav',
    })

    expect(snapshot.trees).toHaveLength(1)
    const navElement = snapshot.trees[0]

    expect(navElement.children).toHaveLength(4)

    // Check each nav item
    navElement.children.forEach((child, index) => {
      expect(child.nodeName).toBe('A')
      expect(child.attributes.class).toBe('nav-item')
      expect(child.computedStyles['background-color']).toBe('rgb(0, 123, 255)')
      expect(child.computedStyles['padding-block-start']).toBe('10px')
      expect(child.computedStyles['padding-block-end']).toBe('10px')
      expect(child.computedStyles['padding-inline-start']).toBe('15px')
      expect(child.computedStyles['padding-inline-end']).toBe('15px')
      expect(child.computedStyles['border-bottom-left-radius']).toBe('4px')
      expect(child.computedStyles['border-bottom-right-radius']).toBe('4px')
      expect(child.computedStyles['border-top-left-radius']).toBe('4px')
      expect(child.computedStyles['border-top-right-radius']).toBe('4px')
    })
  })

  test('should capture grid content layout', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.content',
    })

    expect(snapshot.trees).toHaveLength(1)
    const contentElement = snapshot.trees[0]

    expect(contentElement.computedStyles.display).toBe('grid')

    // Should have main content and sidebar
    expect(contentElement.children).toHaveLength(2)

    const mainContent = contentElement.children.find(
      (child) => child.attributes.class === 'main-content'
    )
    const sidebar = contentElement.children.find((child) => child.attributes.class === 'sidebar')

    expect(mainContent).toBeDefined()
    expect(sidebar).toBeDefined()
    expect(mainContent?.computedStyles['background-color']).toBe('rgb(248, 249, 250)')
    expect(sidebar?.computedStyles['background-color']).toBe('rgb(233, 236, 239)')
  })

  test('should capture card elements with proper styling', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.card',
    })

    // Should find all card elements
    expect(snapshot.trees.length).toBeGreaterThan(1)

    for (const cardElement of snapshot.trees) {
      expect(cardElement.nodeName).toBe('DIV')
      expect(cardElement.attributes.class).toBe('card')
      expect(cardElement.computedStyles['background-color']).toBe('rgb(255, 255, 255)')
      expect(cardElement.computedStyles['padding-block-start']).toBe('15px')
      expect(cardElement.computedStyles['margin-bottom']).toBe('15px')
      expect(cardElement.computedStyles['border-bottom-left-radius']).toBe('4px')
      expect(cardElement.computedStyles['border-bottom-right-radius']).toBe('4px')
      expect(cardElement.computedStyles['border-top-left-radius']).toBe('4px')
      expect(cardElement.computedStyles['border-top-right-radius']).toBe('4px')
      expect(cardElement.computedStyles['border-bottom-color']).toBe('rgb(222, 226, 230)')
      expect(cardElement.computedStyles['border-bottom-style']).toBe('solid')
      expect(cardElement.computedStyles['border-bottom-width']).toBe('1px')
      expect(cardElement.computedStyles['border-top-color']).toBe('rgb(222, 226, 230)')
      expect(cardElement.computedStyles['border-top-style']).toBe('solid')
      expect(cardElement.computedStyles['border-top-width']).toBe('1px')
      expect(cardElement.computedStyles['border-left-color']).toBe('rgb(222, 226, 230)')
    }
  })

  test('should detect layout changes when styles are modified', async ({ page }) => {
    // Capture initial state
    const initialSnapshot = await captureSnapshot(page, {
      selector: '.container',
    })

    // Modify styles
    await page.addStyleTag({
      content: `
        .container {
          max-width: 800px !important;
          background-color: #f0f0f0 !important;
        }
        .header {
          background-color: #ff0000 !important;
          padding: 25px !important;
        }
      `,
    })

    // Capture modified state
    const modifiedSnapshot = await captureSnapshot(page, {
      selector: '.container',
    })

    // Compare snapshots
    const comparisonResult = compareSnapshots(initialSnapshot, modifiedSnapshot)

    expect(comparisonResult.isEqual).toBe(false)
    expect(comparisonResult.differences.length).toBeGreaterThan(0)

    // Check for specific differences
    const backgroundDiff = comparisonResult.differences.find((diff) =>
      diff.path.includes('background-color')
    )
    const paddingDiff = comparisonResult.differences.find((diff) => diff.path.includes('padding'))

    expect(backgroundDiff).toBeDefined()
    expect(paddingDiff).toBeDefined()
  })

  test('should handle responsive layout changes', async ({ page }) => {
    // Desktop snapshot
    await page.setViewportSize({ width: 1200, height: 800 })
    const desktopSnapshot = await captureSnapshot(page, {
      selector: '.content',
    })

    // Mobile snapshot
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(100) // Allow layout recalculation

    const mobileSnapshot = await captureSnapshot(page, {
      selector: '.content',
    })

    // Compare snapshots - should be different due to responsive design
    const comparisonResult = compareSnapshots(desktopSnapshot, mobileSnapshot)

    // Layout should change on mobile
    expect(comparisonResult.isEqual).toBe(false)

    // Check if grid layout properties changed
    const gridDiff = comparisonResult.differences.find(
      (diff) =>
        diff.path.includes('grid-template-columns') ||
        diff.path.includes('width') ||
        diff.path.includes('height')
    )

    expect(gridDiff).toBeDefined()
  })

  test('should capture nested element hierarchy correctly', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.main-content',
    })

    expect(snapshot.trees).toHaveLength(1)
    const mainElement = snapshot.trees[0]

    // Should have child card elements
    expect(mainElement.children.length).toBeGreaterThan(0)

    const cardChildren = mainElement.children.filter((child) => child.attributes.class === 'card')

    expect(cardChildren.length).toBeGreaterThan(0)

    // Each card should have h3 and p children
    for (const card of cardChildren) {
      const hasH3 = card.children.some((child) => child.nodeName === 'H3')
      const hasP = card.children.some((child) => child.nodeName === 'P')

      expect(hasH3).toBe(true)
      expect(hasP).toBe(true)
    }
  })

  test('should preserve DOM structure in snapshot', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: 'body',
    })

    expect(snapshot.trees).toHaveLength(1)
    const bodyElement = snapshot.trees[0]

    // Should have container as direct child
    const containerChild = bodyElement.children.find(
      (child) => child.attributes.class === 'container'
    )

    expect(containerChild).toBeDefined()

    // Container should have header, nav, content, footer
    const expectedChildren = ['header', 'nav', 'content', 'footer']

    assert(containerChild)

    const actualClasses = containerChild.children
      .map((child) => child.attributes.class)
      .filter(Boolean)

    for (const expectedClass of expectedChildren) {
      expect(actualClasses).toContain(expectedClass)
    }
  })
})
