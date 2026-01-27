import { createErr, createOk, unwrapOk, isErr, type Result, unwrapErr } from 'option-t/plain_result'
import type { ObjectModelTraverser } from './object-model-traverser/object-model-traverser.js'
import type { Protocol } from 'playwright-core/types/protocol'
import { isNotNull } from 'option-t/nullable/nullable'

export type CSSOMStyleValue = Record<string, string>

export interface CSSOMElementNode {
  nodeName: string
  uniqueSelector: string
  computedStyles: CSSOMStyleValue
  pseudoStates?: Record<string, CSSOMStyleValue>
  children: CSSOMElementNode[]
  attributes: Record<string, string>
  textContent?: string
}

export async function getComputedStyles(
  traverser: ObjectModelTraverser,
  nodeId: number
): Promise<Result<CSSOMStyleValue, Error>> {
  const computedStyleResult = await traverser.getComputedStyleForNode(nodeId)

  if (isErr(computedStyleResult)) {
    return computedStyleResult
  }

  const { computedStyle } = unwrapOk(computedStyleResult)

  const styles = computedStyle.reduce((acc, style) => {
    acc[style.name] = style.value
    return acc
  }, {} as CSSOMStyleValue)

  return createOk(styles)
}

export async function getMatchedStyles(
  traverser: ObjectModelTraverser,
  nodeId: number
): Promise<Result<CSSOMStyleValue, Error>> {
  const matchedStylesResult = await traverser.getMatchedStylesForNode(nodeId)

  if (isErr(matchedStylesResult)) {
    return matchedStylesResult
  }

  const { matchedCSSRules, inherited } = unwrapOk(matchedStylesResult)
  const styles: CSSOMStyleValue = {}

  // Process matched CSS rules
  if (matchedCSSRules) {
    for (const ruleMatch of matchedCSSRules) {
      const rule = ruleMatch.rule
      if (rule.style && rule.style.cssProperties) {
        for (const cssProperty of rule.style.cssProperties) {
          if (cssProperty.name && cssProperty.value) {
            styles[cssProperty.name] = cssProperty.value
          }
        }
      }
    }
  }

  // Process inherited styles
  if (inherited) {
    for (const inheritedEntry of inherited) {
      if (inheritedEntry.matchedCSSRules) {
        for (const ruleMatch of inheritedEntry.matchedCSSRules) {
          const rule = ruleMatch.rule
          if (rule.style && rule.style.cssProperties) {
            for (const cssProperty of rule.style.cssProperties) {
              if (cssProperty.name && cssProperty.value) {
                // Only add if not already set by direct rules
                if (!(cssProperty.name in styles)) {
                  styles[cssProperty.name] = cssProperty.value
                }
              }
            }
          }
        }
      }
    }
  }

  return createOk(styles)
}

export async function getComputedStylesWithPseudoState(
  traverser: ObjectModelTraverser,
  nodeId: number,
  pseudoState?: string
): Promise<Result<CSSOMStyleValue, Error>> {
  if (!pseudoState) {
    return getMatchedStyles(traverser, nodeId)
  }

  try {
    // Force the pseudo-state using CDP CSS.forcePseudoState
    await forcePseudoState(traverser, nodeId, pseudoState)

    // Get matched styles with the pseudo-state active
    // This will include the pseudo-class rules that are now active
    const stylesResult = await getMatchedStyles(traverser, nodeId)

    // Clear the forced pseudo-state
    await clearForcedPseudoState(traverser, nodeId)

    return stylesResult
  } catch (error) {
    // If forcing pseudo-state fails, fall back to normal matched styles
    console.warn(`Failed to force pseudo-state ${pseudoState}:`, error)
    return getMatchedStyles(traverser, nodeId)
  }
}

async function forcePseudoState(
  traverser: ObjectModelTraverser,
  nodeId: number,
  pseudoState: string
): Promise<void> {
  const pseudoClasses = [pseudoState]

  const result = await traverser.forcePseudoState(nodeId, pseudoClasses)
  if (isErr(result)) {
    throw unwrapErr(result)
  }
}

async function clearForcedPseudoState(
  traverser: ObjectModelTraverser,
  nodeId: number
): Promise<void> {
  const result = await traverser.forcePseudoState(nodeId, [])
  if (isErr(result)) {
    console.warn('Failed to clear forced pseudo-state:', unwrapErr(result))
  }
}

/**
 * Check if an attribute should be excluded based on exclude patterns
 * Supports wildcards like 'data-*', 'aria-*'
 */
function shouldExcludeAttribute(attributeName: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    if (pattern.endsWith('*')) {
      // Wildcard pattern: 'data-*' matches 'data-session-id', 'data-user-id', etc.
      const prefix = pattern.slice(0, -1)
      if (attributeName.startsWith(prefix)) {
        return true
      }
    } else {
      // Exact match
      if (attributeName === pattern) {
        return true
      }
    }
  }
  return false
}

export async function traverseElement(
  traverser: ObjectModelTraverser,
  nodeId: number,
  siblingIndex: number,
  options: {
    includeChildren: boolean
    pseudoStatesMap?: Record<string, string[]>
    excludeAttributes?: string[]
    excludeElements?: string[]
  }
): Promise<Result<CSSOMElementNode, Error>> {
  const describeNodeResult = await traverser.describeNode(nodeId)

  if (isErr(describeNodeResult)) {
    return describeNodeResult
  }

  const { node } = unwrapOk(describeNodeResult)

  if (node.nodeType !== 1) {
    return createErr(new Error('Node is not an element'))
  }

  const attributes: Record<string, string> = {}
  const excludePatterns = options.excludeAttributes || []
  if (node.attributes) {
    for (let i = 0; i < node.attributes.length; i += 2) {
      const name = node.attributes[i]
      const value = node.attributes[i + 1] || ''

      // Skip excluded attributes
      if (!shouldExcludeAttribute(name, excludePatterns)) {
        attributes[name] = value
      }
    }
  }

  const computedStylesResult = await getMatchedStyles(traverser, nodeId)

  // Generate unique selector for this element
  const uniqueSelector = generateUniqueSelector(node, siblingIndex)

  // Check if this element has pseudo-states defined
  const pseudoStates: Record<string, CSSOMStyleValue> = {}
  if (options.pseudoStatesMap && options.pseudoStatesMap[uniqueSelector]) {
    for (const pseudoState of options.pseudoStatesMap[uniqueSelector]) {
      const pseudoStylesResult = await getComputedStylesWithPseudoState(
        traverser,
        nodeId,
        pseudoState
      )
      if (!isErr(pseudoStylesResult)) {
        pseudoStates[pseudoState] = unwrapOk(pseudoStylesResult)
      }
    }
  }

  const childrenResults =
    options.includeChildren && node.children
      ? (
          await Promise.all(
            node.children.map(async (child, index) => {
              if (child.nodeType !== 1) {
                return null
              }

              // Check if this element type should be excluded
              const excludeElementTypes = (options.excludeElements || []).map(tag => tag.toUpperCase())
              if (child.nodeName && excludeElementTypes.includes(child.nodeName.toUpperCase())) {
                return null
              }

              return traverseElement(traverser, child.nodeId, index, {
                includeChildren: true,
                pseudoStatesMap: options.pseudoStatesMap,
                excludeAttributes: options.excludeAttributes,
                excludeElements: options.excludeElements,
              })
            })
          )
        ).filter(isNotNull)
      : []

  const errors = childrenResults.filter(isErr)
  if (errors.length > 0) {
    return createErr(
      new Error('Failed to traverse children', {
        cause: new AggregateError(errors.map(unwrapErr)),
      })
    )
  }

  const children = childrenResults.map(unwrapOk)

  const elementNode: CSSOMElementNode = {
    nodeName: node.nodeName,
    uniqueSelector,
    computedStyles: unwrapOk(computedStylesResult),
    children,
    attributes,
    textContent: node.nodeValue || undefined,
  }

  // Add pseudo-states if any were found
  if (Object.keys(pseudoStates).length > 0) {
    elementNode.pseudoStates = pseudoStates
  }

  return createOk(elementNode)
}

function generateUniqueSelector(element: Protocol.DOM.Node, siblingIndex: number): string {
  const selectorParts = []

  if (element.nodeName) {
    selectorParts.push(element.nodeName.toLowerCase())
  }

  const idIndex = element.attributes?.findIndex((attribute) => attribute === 'id')
  const classNameIndex = element.attributes?.findIndex((attribute) => attribute === 'class')

  if (classNameIndex !== -1 && classNameIndex != null) {
    selectorParts.push(`.${element.attributes?.[classNameIndex + 1]}`)
  }

  if (idIndex !== -1 && idIndex != null) {
    selectorParts.push(`#${element.attributes?.[idIndex + 1]}`)
  }

  selectorParts.push(`@${siblingIndex}`)

  return selectorParts.join('')
}
