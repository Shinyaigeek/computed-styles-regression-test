import { createErr, createOk, type Result } from 'option-t/plain_result'
import type { Protocol } from 'playwright-core/types/protocol'
import type { CDPSession } from '../infrastructure/cdp.js'
import { UnknownError } from '../error.js'

export interface ObjectModelTraverser {
  getDocument(): Promise<Result<Protocol.CommandReturnValues['DOM.getDocument'], Error>>
  querySelectorAll(
    nodeId: number,
    selector: string
  ): Promise<Result<Protocol.CommandReturnValues['DOM.querySelectorAll'], Error>>
  describeNode(
    nodeId: number
  ): Promise<Result<Protocol.CommandReturnValues['DOM.describeNode'], Error>>
  getComputedStyleForNode(
    nodeId: number
  ): Promise<Result<Protocol.CommandReturnValues['CSS.getComputedStyleForNode'], Error>>
  getMatchedStylesForNode(
    nodeId: number
  ): Promise<Result<Protocol.CommandReturnValues['CSS.getMatchedStylesForNode'], Error>>
  forcePseudoState(nodeId: number, forcedPseudoClasses: string[]): Promise<Result<void, Error>>
}

export class ObjectModelTraverserByCDP implements ObjectModelTraverser {
  constructor(private readonly cdp: CDPSession) {}

  static async initialize(cdp: CDPSession): Promise<Result<ObjectModelTraverserByCDP, Error>> {
    const traverser = new ObjectModelTraverserByCDP(cdp)

    try {
      await traverser.cdp.send('DOM.enable', {})
      await traverser.cdp.send('CSS.enable', {})
      return createOk(traverser)
    } catch (error) {
      return createErr(new UnknownError(error))
    }
  }

  async getDocument() {
    const result = await this.cdp.send('DOM.getDocument', {
      depth: -1,
      pierce: true,
    })
    return result
  }

  async querySelectorAll(nodeId: number, selector: string) {
    const result = await this.cdp.send('DOM.querySelectorAll', {
      nodeId,
      selector,
    })
    return result
  }

  async describeNode(nodeId: number) {
    const result = await this.cdp.send('DOM.describeNode', {
      nodeId,
      pierce: true,
      depth: -1,
    })
    return result
  }

  async getComputedStyleForNode(nodeId: number) {
    const result = await this.cdp.send('CSS.getComputedStyleForNode', {
      nodeId,
    })
    return result
  }

  async getMatchedStylesForNode(nodeId: number) {
    const result = await this.cdp.send('CSS.getMatchedStylesForNode', {
      nodeId,
    })
    return result
  }

  async forcePseudoState(nodeId: number, forcedPseudoClasses: string[]) {
    try {
      await this.cdp.send('CSS.forcePseudoState', {
        nodeId,
        forcedPseudoClasses,
      })
      return createOk(undefined)
    } catch (error) {
      return createErr(new UnknownError(error))
    }
  }
}
