import type { Page, CDPSession as PlaywrightCDPSession } from 'playwright'
import type { Protocol } from 'playwright-core/types/protocol'
import { createErr, createOk, type Result } from 'option-t/plain_result'
import { UnknownError } from '../error.js'

export interface CDPSession {
  start(): Promise<void>
  finish(): Promise<Result<void, Error>>
  send<T extends keyof Protocol.CommandParameters>(
    method: T,
    params: Protocol.CommandParameters[T]
  ): Promise<Result<Protocol.CommandReturnValues[T], Error>>
}

export class CDPSessionNotFoundError extends Error {
  message = 'CDP session not found'
}

export class CDPSessionByPlaywright implements CDPSession {
  private session: PlaywrightCDPSession | null = null

  constructor(private readonly page: Page) {}

  async start() {
    this.session = await this.page.context().newCDPSession(this.page)
  }

  async finish() {
    if (!this.session) {
      return createErr(new CDPSessionNotFoundError())
    }
    try {
      await this.session.detach()
    } catch (error) {
      return createErr(new UnknownError(error))
    }
    return createOk(undefined)
  }

  async send<T extends keyof Protocol.CommandParameters>(
    method: T,
    params: Protocol.CommandParameters[T]
  ): Promise<Result<Protocol.CommandReturnValues[T], Error>> {
    if (!this.session) {
      return createErr(new CDPSessionNotFoundError())
    }
    try {
      const result = await this.session.send(method, params)
      return createOk(result)
    } catch (error) {
      return createErr(new UnknownError(error))
    }
  }
}
