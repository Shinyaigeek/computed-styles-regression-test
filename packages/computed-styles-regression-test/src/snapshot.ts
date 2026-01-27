import type { Page } from 'playwright-core'
import { CDPSessionByPlaywright } from './infrastructure/cdp.js'
import { ObjectModelTraverserByCDP } from './object-model-traverser/object-model-traverser.js'
import { isErr, unwrapErr, unwrapOk } from 'option-t/plain_result'
import { type CSSOMElementNode, traverseElement } from './node.js'

const PSEUDO_CLASSES = [
  'hover',
  'focus',
  'active',
  'focus-within',
  'focus-visible',
  'target',
] as const
type PseudoClass = (typeof PSEUDO_CLASSES)[number]

export interface CSSOMSnapshot {
  url: string
  trees: CSSOMElementNode[]
}

export interface CaptureSnapshotOptions {
  selector?: string
  includeChildren?: boolean
  includePseudoStates?: boolean
  /**
   * Attributes to exclude from snapshot.
   * Useful for excluding sensitive data (tokens, session IDs) from being saved.
   * Example: ['data-session-id', 'data-user-token']
   */
  excludeAttributes?: string[]
  /**
   * Element types (tag names) to exclude from snapshot.
   * Useful for excluding elements irrelevant to computed styles.
   * Example: ['script', 'noscript', 'meta']
   */
  excludeElements?: string[]
}

export const captureSnapshot = async (
  page: Page,
  options: CaptureSnapshotOptions = {}
): Promise<CSSOMSnapshot> => {
  const {
    selector = 'body',
    includeChildren = true,
    includePseudoStates = true,
    excludeAttributes = [],
    excludeElements = []
  } = options
  const cdpSession = new CDPSessionByPlaywright(page)
  await cdpSession.start()

  try {
    // Detect pseudo-states if requested
    let pseudoStatesMap: Record<string, PseudoClass[]> = {}
    if (includePseudoStates) {
      pseudoStatesMap = await detectElementsWithPseudoStates(page, selector)
    }

    const traverserResult = await ObjectModelTraverserByCDP.initialize(cdpSession)

    if (isErr(traverserResult)) {
      throw unwrapErr(traverserResult)
    }

    const traverser = unwrapOk(traverserResult)

    const documentResult = await traverser.getDocument()

    if (isErr(documentResult)) {
      throw unwrapErr(documentResult)
    }

    const document = unwrapOk(documentResult)
    const { root } = document

    const querySelectorResult = await traverser.querySelectorAll(root.nodeId, selector)

    if (isErr(querySelectorResult)) {
      throw unwrapErr(querySelectorResult)
    }

    const { nodeIds } = unwrapOk(querySelectorResult)

    if (nodeIds.length === 0) {
      throw new Error(`No elements found for selector: ${selector}`)
    }

    const treeResults = await Promise.all(
      nodeIds.map(async (nodeId) => {
        const element = await traverseElement(traverser, nodeId, 0, {
          includeChildren,
          pseudoStatesMap,
          excludeAttributes,
          excludeElements,
        })
        return element
      })
    )

    const errors = treeResults.filter(isErr)
    if (errors.length > 0) {
      throw new Error('Failed to traverse elements', {
        cause: new AggregateError(errors.map(unwrapErr)),
      })
    }

    const trees = treeResults.map(unwrapOk)

    const snapshot: CSSOMSnapshot = {
      url: page.url(),
      trees,
    }

    return snapshot
  } finally {
    await cdpSession.finish()
  }
}

/**
 * Detect elements that have pseudo-class styles defined in CSS
 */
const detectElementsWithPseudoStates = async (
  page: Page,
  selector: string
): Promise<Record<string, PseudoClass[]>> => {
  return await page.evaluate(
    (args) => {
      const { selector, pseudoClasses } = args
      const elementPseudoStates = new Map<string, string[]>()

      try {
        // Get all elements within the selector scope
        const rootElements = document.querySelectorAll(selector)
        const allElements: Element[] = []

        for (let k = 0; k < rootElements.length; k++) {
          const root = rootElements[k]
          allElements.push(root)
          const descendants = root.querySelectorAll('*')
          for (let l = 0; l < descendants.length; l++) {
            allElements.push(descendants[l])
          }
        }

        // Check each stylesheet for pseudo-class rules
        for (let i = 0; i < document.styleSheets.length; i++) {
          const stylesheet = document.styleSheets[i]
          try {
            // Skip external stylesheets that might cause CORS issues
            if (stylesheet.href && !stylesheet.href.startsWith(window.location.origin)) {
              continue
            }

            const rules = stylesheet.cssRules
            if (!rules) continue

            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j]
              if (rule instanceof CSSStyleRule) {
                const selectorText = rule.selectorText

                // Check if the selector contains any pseudo-classes
                for (const pseudoClass of pseudoClasses) {
                  if (selectorText.includes(`:${pseudoClass}`)) {
                    // Extract the base selector (remove pseudo-classes)
                    const baseSelector = selectorText
                      .replace(new RegExp(`:${pseudoClass}[^,\\s]*`, 'g'), '')
                      .replace(/::?[a-zA-Z-]+/g, '') // Remove other pseudo-elements
                      .replace(/\s*,\s*/g, ',')
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0)
                      .filter((s) => !s.match(/^[+~>]|[+~>]$/)) // Remove combinators

                    // Check which elements match the base selector
                    for (const base of baseSelector) {
                      if (!base || base.includes(':')) continue

                      try {
                        const matchingElements = Array.from(allElements).filter((el) =>
                          el.matches(base)
                        )

                        for (const element of matchingElements) {
                          // Generate a unique identifier for the element
                          const uniqueId = generateElementIdentifier(element)

                          if (!elementPseudoStates.has(uniqueId)) {
                            elementPseudoStates.set(uniqueId, [])
                          }

                          const states = elementPseudoStates.get(uniqueId)!
                          if (!states.includes(pseudoClass)) {
                            states.push(pseudoClass)
                          }
                        }
                      } catch (e) {
                        // Skip invalid selectors
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Skip stylesheets that can't be accessed
          }
        }
      } catch (e) {
        console.warn('Error detecting pseudo-states:', e)
      }

      const result: Record<string, PseudoClass[]> = {}
      for (const [key, value] of elementPseudoStates) {
        result[key] = value.filter((v) => pseudoClasses.includes(v as any)) as PseudoClass[]
      }
      return result

      function generateElementIdentifier(element: Element): string {
        const parts = [element.tagName.toLowerCase()]

        if (element.id) {
          parts.push(`#${element.id}`)
        }

        if (element.className) {
          const classes = element.className.split(/\s+/).filter((c) => c.length > 0)
          if (classes.length > 0) {
            parts.push(`.${classes.join('.')}`)
          }
        }

        // Add position among siblings for uniqueness
        const siblings = Array.from(element.parentElement?.children || [])
        const index = siblings.indexOf(element)
        parts.push(`@${index}`)

        return parts.join('')
      }
    },
    { selector, pseudoClasses: PSEUDO_CLASSES }
  )
}
