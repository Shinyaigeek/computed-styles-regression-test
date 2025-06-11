import { test, expect } from '@playwright/test'
import { captureSnapshot, compareSnapshots } from 'cssom-regression-test'

test.describe('Flexbox & Grid Layout CSSOM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/flexbox-grid.html')
    await page.waitForLoadState('networkidle')
  })

  test('should capture flexbox header layout', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.flex-header',
    })

    expect(snapshot.trees).toHaveLength(1)
    const headerElement = snapshot.trees[0]

    expect(headerElement.computedStyles.display).toBe('flex')
    expect(headerElement.computedStyles['justify-content']).toBe('space-between')
    expect(headerElement.computedStyles['align-items']).toBe('center')

    // Should have logo and header-actions children
    expect(headerElement.children).toHaveLength(2)

    const logo = headerElement.children.find((child) => child.attributes.class === 'logo')
    const actions = headerElement.children.find(
      (child) => child.attributes.class === 'header-actions'
    )

    expect(logo).toBeDefined()
    expect(actions).toBeDefined()
    expect(actions?.computedStyles.display).toBe('flex')
  })

  test('should capture CSS Grid layout structure', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.grid-layout',
    })

    expect(snapshot.trees).toHaveLength(1)
    const gridElement = snapshot.trees[0]

    expect(gridElement.computedStyles.display).toBe('grid')
    expect(gridElement.computedStyles['grid-template-areas']).toContain('sidebar main widgets')

    // Should have sidebar, main, widgets, footer areas
    const expectedAreas = ['sidebar', 'main-area', 'widgets-area', 'grid-footer']
    const childClasses = gridElement.children.map((child) => child.attributes.class).filter(Boolean)

    for (const expectedClass of expectedAreas) {
      expect(childClasses).toContain(expectedClass)
    }
  })

  test('should capture grid areas with correct positioning', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.sidebar',
    })

    expect(snapshot.trees).toHaveLength(1)
    const sidebarElement = snapshot.trees[0]

    expect(sidebarElement.computedStyles['background-color']).toBe('rgb(248, 249, 250)')

    // Should contain navigation menu
    const menuList = sidebarElement.children.find(
      (child) => child.attributes.class === 'sidebar-menu'
    )

    expect(menuList).toBeDefined()
    expect(menuList?.nodeName).toBe('UL')
    expect(menuList?.children.length).toBeGreaterThan(0)
  })

  test('should capture auto-fit grid cards', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.card-grid',
    })

    expect(snapshot.trees).toHaveLength(1)
    const cardGridElement = snapshot.trees[0]

    expect(cardGridElement.computedStyles.display).toBe('grid')

    // Should have feature cards
    const featureCards = cardGridElement.children.filter(
      (child) => child.attributes.class === 'feature-card'
    )

    expect(featureCards.length).toBeGreaterThan(0)

    // Each card should have proper styling
    for (const card of featureCards) {
      expect(card.computedStyles['background-color']).toBe('rgb(255, 255, 255)')
      expect(card.computedStyles['border-bottom-left-radius']).toBe('8px')
      expect(card.computedStyles['border-bottom-right-radius']).toBe('8px')
      expect(card.computedStyles['border-top-left-radius']).toBe('8px')
      expect(card.computedStyles['border-top-right-radius']).toBe('8px')
      expect(card.computedStyles['padding-block-start']).toBe('24px')
      expect(card.computedStyles['padding-block-end']).toBe('24px')
      expect(card.computedStyles['padding-inline-start']).toBe('24px')
      expect(card.computedStyles['padding-inline-end']).toBe('24px')
      expect(card.computedStyles.position).toBe('relative')
    }
  })

  test('should capture flexbox navigation with proper gap', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.sidebar-menu',
    })

    expect(snapshot.trees).toHaveLength(1)
    const menuElement = snapshot.trees[0]

    expect(menuElement.nodeName).toBe('UL')
    expect(menuElement.computedStyles['list-style-type']).toBe('none')
    expect(menuElement.computedStyles['padding-block-start']).toBe('0px')
    expect(menuElement.computedStyles['padding-block-end']).toBe('0px')
    expect(menuElement.computedStyles['padding-inline-start']).toBe('0px')
    expect(menuElement.computedStyles['padding-inline-end']).toBe('0px')
    expect(menuElement.computedStyles['margin-block-start']).toBe('0px')
    expect(menuElement.computedStyles['margin-block-end']).toBe('0px')
    expect(menuElement.computedStyles['margin-inline-start']).toBe('0px')
    expect(menuElement.computedStyles['margin-inline-end']).toBe('0px')

    // Check menu items
    const menuItems = menuElement.children
    expect(menuItems.length).toBeGreaterThan(0)

    for (const item of menuItems) {
      expect(item.nodeName).toBe('LI')
      expect(item.computedStyles['margin-bottom']).toBe('10px')

      // Each li should have an anchor
      const anchor = item.children.find((child) => child.nodeName === 'A')
      expect(anchor).toBeDefined()
      expect(anchor?.computedStyles.display).toBe('block')
      expect(anchor?.computedStyles['padding-block-start']).toBe('12px')
      expect(anchor?.computedStyles['padding-block-end']).toBe('12px')
      expect(anchor?.computedStyles['padding-inline-start']).toBe('16px')
      expect(anchor?.computedStyles['padding-inline-end']).toBe('16px')
    }
  })

  test('should capture stats flexbox layout', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.stats-flex',
    })

    expect(snapshot.trees).toHaveLength(1)
    const statsElement = snapshot.trees[0]

    expect(statsElement.computedStyles.display).toBe('flex')
    expect(statsElement.computedStyles['justify-content']).toBe('space-around')
    expect(statsElement.computedStyles['padding-block-start']).toBe('20px')
    expect(statsElement.computedStyles['padding-block-end']).toBe('20px')
    expect(statsElement.computedStyles['padding-inline-start']).toBe('0px')
    expect(statsElement.computedStyles['padding-inline-end']).toBe('0px')

    // Should have stat items
    const statItems = statsElement.children.filter(
      (child) => child.attributes.class === 'stat-item'
    )

    expect(statItems.length).toBe(4)

    for (const item of statItems) {
      expect(item.computedStyles['text-align']).toBe('center')

      // Should have number and label
      const hasNumber = item.children.some((child) => child.attributes.class === 'stat-number')
      const hasLabel = item.children.some((child) => child.attributes.class === 'stat-label')

      expect(hasNumber).toBe(true)
      expect(hasLabel).toBe(true)
    }
  })

  test('should capture flex tags with wrap behavior', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.flex-tags',
    })

    // Multiple flex-tags elements should exist
    expect(snapshot.trees.length).toBeGreaterThan(0)

    for (const tagsElement of snapshot.trees) {
      expect(tagsElement.computedStyles.display).toBe('flex')
      expect(tagsElement.computedStyles['flex-wrap']).toBe('wrap')

      // Should have tag children
      const tags = tagsElement.children.filter((child) => child.attributes.class === 'tag')

      expect(tags.length).toBeGreaterThan(0)

      for (const tag of tags) {
        expect(tag.computedStyles['padding-block-start']).toBe('4px')
        expect(tag.computedStyles['padding-block-end']).toBe('4px')
        expect(tag.computedStyles['padding-inline-start']).toBe('12px')
        expect(tag.computedStyles['padding-inline-end']).toBe('12px')
        expect(tag.computedStyles['border-bottom-left-radius']).toBe('20px')
        expect(tag.computedStyles['font-size']).toBe('12px')
      }
    }
  })

  test('should detect grid layout changes when columns are modified', async ({ page }) => {
    // Capture initial grid layout
    const initialSnapshot = await captureSnapshot(page, {
      selector: '.grid-layout',
    })

    // Modify grid columns
    await page.addStyleTag({
      content: `
        .grid-layout {
          grid-template-columns: 200px 1fr 250px !important;
          grid-template-areas: 
            "sidebar main main"
            "sidebar main main"
            "footer footer footer" !important;
        }
      `,
    })

    // Capture modified layout
    const modifiedSnapshot = await captureSnapshot(page, {
      selector: '.grid-layout',
    })

    // Compare snapshots
    const comparisonResult = compareSnapshots(initialSnapshot, modifiedSnapshot)

    expect(comparisonResult.isEqual).toBe(false)
    expect(comparisonResult.differences.length).toBeGreaterThan(0)

    // Should detect grid-template-columns change
    const columnDiff = comparisonResult.differences.find((diff) =>
      diff.path.includes('grid-template-columns')
    )
    const areaDiff = comparisonResult.differences.find((diff) =>
      diff.path.includes('grid-template-areas')
    )

    expect(columnDiff).toBeDefined()
    expect(areaDiff).toBeDefined()
  })

  test('should capture responsive grid behavior', async ({ page }) => {
    // Large screen
    await page.setViewportSize({ width: 1400, height: 900 })
    const largeScreenSnapshot = await captureSnapshot(page, {
      selector: '.card-grid',
    })

    // Small screen
    await page.setViewportSize({ width: 600, height: 800 })
    await page.waitForTimeout(200) // Allow layout recalculation

    const smallScreenSnapshot = await captureSnapshot(page, {
      selector: '.card-grid',
    })

    // Layout should adapt to screen size
    const comparisonResult = compareSnapshots(largeScreenSnapshot, smallScreenSnapshot)

    // Auto-fit grid should create different column layouts
    expect(comparisonResult.isEqual).toBe(false)

    // Check for width/layout differences
    const layoutDiff = comparisonResult.differences.find(
      (diff) => diff.path.includes('width') || diff.path.includes('grid-template-columns')
    )

    expect(layoutDiff).toBeDefined()
  })

  test('should capture complex nested flex and grid combinations', async ({ page }) => {
    const snapshot = await captureSnapshot(page, {
      selector: '.layout-container',
    })

    expect(snapshot.trees).toHaveLength(1)
    const containerElement = snapshot.trees[0]

    // Should have flex header
    const flexHeader = containerElement.children.find(
      (child) => child.attributes.class === 'flex-header'
    )
    expect(flexHeader?.computedStyles.display).toBe('flex')

    // Should have grid layout
    const gridLayout = containerElement.children.find(
      (child) => child.attributes.class === 'grid-layout'
    )
    expect(gridLayout?.computedStyles.display).toBe('grid')

    // Grid should contain areas with different display types
    const mainArea = gridLayout?.children.find((child) => child.attributes.class === 'main-area')

    // Main area should contain card-grid which is also grid
    const cardGrid = mainArea?.children.find((child) => child.attributes.class === 'card-grid')
    expect(cardGrid?.computedStyles.display).toBe('grid')

    // Cards should contain flex-tags
    const featureCard = cardGrid?.children.find(
      (child) => child.attributes.class === 'feature-card'
    )
    const flexTags = featureCard?.children.find((child) => child.attributes.class === 'flex-tags')
    expect(flexTags?.computedStyles.display).toBe('flex')
  })
})
