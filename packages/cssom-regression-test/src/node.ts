import {
  createErr,
  createOk,
  unwrapOk,
  isErr,
  type Result,
  unwrapErr,
} from 'option-t/esm/plain_result'
import type { ObjectModelTraverser } from './object-model-traverser/object-model-traverser'
import type { Protocol } from 'playwright-core/types/protocol'

export type CSSOMStyleValue = Record<string, string>

export interface CSSOMElementNode {
  nodeName: string
  uniqueSelector: string
  computedStyles: CSSOMStyleValue
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

export async function traverseElement(
  traverser: ObjectModelTraverser,
  nodeId: number,
  siblingIndex: number,
  options: {
    includeChildren: boolean
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
  if (node.attributes) {
    for (let i = 0; i < node.attributes.length; i += 2) {
      const name = node.attributes[i]
      const value = node.attributes[i + 1] || ''
      attributes[name] = value
    }
  }

  const computedStylesResult = await getComputedStyles(traverser, nodeId)

  const childrenResults =
    options.includeChildren && node.children
      ? await Promise.all(
          node.children.map(async (child, index) => {
            return traverseElement(traverser, child.nodeId, index, { includeChildren: true })
          })
        )
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

  const uniqueSelector = generateUniqueSelector(node, siblingIndex)

  return createOk({
    nodeName: node.nodeName,
    uniqueSelector,
    computedStyles: unwrapOk(computedStylesResult),
    children,
    attributes,
    textContent: node.nodeValue || undefined,
  })
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
