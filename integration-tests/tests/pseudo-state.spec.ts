import { test, expect } from '@playwright/test'
import { captureSnapshot, compareSnapshots } from 'cssom-regression-test'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

test.describe('Pseudo-State Detection', () => {
  test('should auto-detect pseudo-states from CSS', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Capture snapshot with auto-detected pseudo-states
    const snapshot = await captureSnapshot(page, {
      selector: 'body',
      includePseudoStates: true,
    })

    expect(snapshot.trees).toBeDefined()

    // Check if any elements have pseudo-states
    const hasElementsWithPseudoStates = snapshot.trees.some((tree) => hasAnyPseudoStates(tree))

    expect(hasElementsWithPseudoStates).toBe(true)
  })

  test('should match pseudo-state snapshots', async ({ page }) => {
    await page.goto('http://localhost:3000')

    const snapshotPath = join(__dirname, 'snapshots', 'pseudo-state-snapshot.json')

    // Capture current snapshot with pseudo-states
    const currentSnapshot = await captureSnapshot(page, {
      selector: 'header',
      includePseudoStates: true,
    })

    if (!existsSync(snapshotPath)) {
      // Create baseline snapshot
      writeFileSync(snapshotPath, JSON.stringify(currentSnapshot, null, 2))
      console.log('Created baseline pseudo-state snapshot')
      return
    }

    // Compare with existing snapshot
    const expectedSnapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
    const comparison = compareSnapshots(expectedSnapshot, currentSnapshot)

    if (!comparison.isEqual) {
      console.log('Pseudo-state differences:', comparison.differences)
    }

    expect(comparison.isEqual).toBe(true)
  })

  test('should detect hover and focus pseudo-states', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Capture snapshot focusing on navigation area
    const navSnapshot = await captureSnapshot(page, {
      selector: 'nav',
    })

    expect(navSnapshot.trees).toBeDefined()

    // Log detected pseudo-states for debugging
    const pseudoStates = extractPseudoStates(navSnapshot.trees)
    console.log('Detected pseudo-states:', pseudoStates)

    // We expect at least hover states to be detected
    expect(Object.keys(pseudoStates).length).toBeGreaterThan(0)

    // Check that hover states actually have different styles
    let foundDifferentHoverStyles = false
    for (const tree of navSnapshot.trees) {
      if (hasDifferentPseudoStyles(tree)) {
        foundDifferentHoverStyles = true
        break
      }
    }

    expect(foundDifferentHoverStyles).toBe(true)
  })

  function hasDifferentPseudoStyles(node: any): boolean {
    // Check if this node has pseudo-states with different styles
    if (node.pseudoStates) {
      for (const [pseudoState, pseudoStyles] of Object.entries(node.pseudoStates)) {
        // Compare pseudo-state styles with default styles
        const defaultStyles = node.computedStyles
        const hasDifference = Object.keys(pseudoStyles as any).some(
          (prop) => (defaultStyles as any)[prop] !== (pseudoStyles as any)[prop]
        )

        if (hasDifference) {
          console.log(`Found different ${pseudoState} styles for ${node.uniqueSelector}`)
          return true
        }
      }
    }

    // Check children recursively
    return node.children.some((child: any) => hasDifferentPseudoStyles(child))
  }

  function hasAnyPseudoStates(node: any): boolean {
    if (node.pseudoStates && Object.keys(node.pseudoStates).length > 0) {
      return true
    }

    return node.children.some((child: any) => hasAnyPseudoStates(child))
  }

  function extractPseudoStates(trees: any[]): Record<string, string[]> {
    const allPseudoStates: Record<string, string[]> = {}

    function traverse(node: any) {
      if (node.pseudoStates) {
        allPseudoStates[node.uniqueSelector] = Object.keys(node.pseudoStates)
      }

      node.children.forEach((child: any) => traverse(child))
    }

    trees.forEach((tree) => traverse(tree))
    return allPseudoStates
  }
})
