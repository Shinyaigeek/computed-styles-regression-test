import type { CSSOMElementNode } from './node.js'
import type { CSSOMSnapshot } from './snapshot.js'

export interface ComparisonResult {
  isEqual: boolean
  differences: ComparisonDifference[]
}

export interface ComparisonDifference {
  type: 'structure' | 'style'
  path: string
  expected: unknown
  actual: unknown
  description: string
}

export interface ComparisonOptions {
  ignoreClassNames?: boolean
  ignoreInlineStyles?: boolean
  strictStructureComparison?: boolean
  styleProperties?: string[]
}

function compareElements(
  expected: CSSOMElementNode,
  actual: CSSOMElementNode,
  path: string,
  options: ComparisonOptions
): ComparisonDifference[] {
  const differences: ComparisonDifference[] = []

  // Compare tag names
  if (expected.nodeName !== actual.nodeName) {
    differences.push({
      type: 'structure',
      path: `${path}.nodeName`,
      expected: expected.nodeName,
      actual: actual.nodeName,
      description: `Node name mismatch at ${path}`,
    })
  }

  // Compare attributes (if not ignoring class names)
  if (!options.ignoreClassNames) {
    const expectedAttrs = { ...expected.attributes }
    const actualAttrs = { ...actual.attributes }

    for (const [key, value] of Object.entries(expectedAttrs)) {
      if (actualAttrs[key] !== value) {
        differences.push({
          type: 'structure',
          path: `${path}.attributes.${key}`,
          expected: value,
          actual: actualAttrs[key],
          description: `Attribute ${key} mismatch at ${path}`,
        })
      }
    }

    for (const key of Object.keys(actualAttrs)) {
      if (!(key in expectedAttrs)) {
        differences.push({
          type: 'structure',
          path: `${path}.attributes.${key}`,
          expected: undefined,
          actual: actualAttrs[key],
          description: `Unexpected attribute ${key} at ${path}`,
        })
      }
    }
  }

  // Compare computed styles
  const expectedStyles = new Map(Object.entries(expected.computedStyles))
  const actualStyles = new Map(Object.entries(actual.computedStyles))

  const stylesToCheck = options.styleProperties || Array.from(expectedStyles.keys())

  for (const property of stylesToCheck) {
    const expectedValue = expectedStyles.get(property)
    const actualValue = actualStyles.get(property)

    if (expectedValue !== actualValue) {
      differences.push({
        type: 'style',
        path: `${path}.styles.${property}`,
        expected: expectedValue,
        actual: actualValue,
        description: `Style property ${property} mismatch at ${path}`,
      })
    }
  }

  // Compare children count if strict structure comparison
  if (options.strictStructureComparison && expected.children.length !== actual.children.length) {
    differences.push({
      type: 'structure',
      path: `${path}.children.length`,
      expected: expected.children.length,
      actual: actual.children.length,
      description: `Children count mismatch at ${path}`,
    })
  }

  // Compare children recursively
  const minChildrenLength = Math.min(expected.children.length, actual.children.length)
  for (let i = 0; i < minChildrenLength; i++) {
    const childDifferences = compareElements(
      expected.children[i],
      actual.children[i],
      `${path}.children[${i}]`,
      options
    )
    differences.push(...childDifferences)
  }

  return differences
}

export function compareSnapshots(
  expected: CSSOMSnapshot,
  actual: CSSOMSnapshot,
  options: ComparisonOptions = {}
): ComparisonResult {
  const differences: ComparisonDifference[] = []

  // Compare trees count
  if (expected.trees.length !== actual.trees.length) {
    differences.push({
      type: 'structure',
      path: 'trees.length',
      expected: expected.trees.length,
      actual: actual.trees.length,
      description: 'Root elements count mismatch',
    })
  }

  // Compare each tree
  const minTreesLength = Math.min(expected.trees.length, actual.trees.length)
  for (let i = 0; i < minTreesLength; i++) {
    const treeDifferences = compareElements(
      expected.trees[i],
      actual.trees[i],
      `trees[${i}]`,
      options
    )
    differences.push(...treeDifferences)
  }

  return {
    isEqual: differences.length === 0,
    differences,
  }
}

export function findElementByPath(snapshot: CSSOMSnapshot, path: string): CSSOMElementNode | null {
  const pathParts = path.split('.')
  let current: unknown = snapshot

  for (const part of pathParts) {
    if (part.includes('[') && part.includes(']')) {
      const [key, indexStr] = part.split('[')
      const index = Number.parseInt(indexStr.replace(']', ''), 10)
      current = (current as Record<string, unknown[]>)[key]?.[index]
    } else {
      current = (current as Record<string, unknown>)[part]
    }

    if (current == null) {
      return null
    }
  }

  return current as CSSOMElementNode
}
