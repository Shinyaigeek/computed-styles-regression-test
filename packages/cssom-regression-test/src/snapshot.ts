import type { NodeStyle } from './node'

export interface CSSOMSnapshot {
  url: string
  selector: string
  timestamp: number
  trees: Array<NodeStyle>
}
