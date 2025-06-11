import { createOk, unwrapOk, isErr, type Result } from 'option-t/esm/plain_result'
import type { ObjectModelTraverser } from './object-model-traverser/object-model-traverser'

export type CSSOMStyleValue = Record<string, string>

export interface CSSOMElementNode {
  tagName: string
  selector: string
  uniqueSelector: string
  computedStyles: CSSOMStyleValue[]
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
