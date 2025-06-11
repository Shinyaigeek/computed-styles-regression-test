import type { Page } from 'playwright-core'
import { CDPSessionByPlaywright } from './infrastructure/cdp.js'
import { ObjectModelTraverserByCDP } from './object-model-traverser/object-model-traverser.js'
import { isErr, unwrapErr, unwrapOk } from 'option-t/plain_result'
import { type CSSOMElementNode, traverseElement } from './node.js'

export interface CSSOMSnapshot {
  url: string
  trees: CSSOMElementNode[]
}

export const captureSnapshot = async (
  page: Page,
  options: {
    selector?: string
    includeChildren?: boolean
  } = {}
): Promise<CSSOMSnapshot> => {
  const { selector = 'body', includeChildren = true } = options
  const cdpSession = new CDPSessionByPlaywright(page)
  await cdpSession.start()

  try {
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
        const element = await traverseElement(traverser, nodeId, 0, { includeChildren })
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
