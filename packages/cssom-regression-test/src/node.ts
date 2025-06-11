export interface NodeStyle {
  nodeId: number
  nodeName: string
  attributes: string[]
  computedStyle: Record<string, string>
  children: Array<NodeStyle>
}
