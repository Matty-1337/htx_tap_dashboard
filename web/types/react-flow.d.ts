declare module 'react-flow' {
  import { ComponentType, ReactNode } from 'react'

  export interface Node {
    id: string
    type?: string
    position: { x: number; y: number }
    data: any
  }

  export interface Edge {
    id: string
    source: string
    target: string
    type?: string
    animated?: boolean
    style?: any
    markerEnd?: any
    data?: any
  }

  export interface BackgroundProps {
    color?: string
    gap?: number
    size?: number
    opacity?: number
  }

  export interface ControlsProps {
    style?: any
  }

  export interface MiniMapProps {
    style?: any
  }

  export interface HandleProps {
    type?: 'source' | 'target'
    position?: 'top' | 'right' | 'bottom' | 'left'
    style?: any
  }

  export type MarkerType = 'arrow' | 'arrowclosed'

  export interface ReactFlowProps {
    nodes: Node[]
    edges: Edge[]
    onNodesChange?: (changes: any) => void
    onEdgesChange?: (changes: any) => void
    nodeTypes?: Record<string, ComponentType<any>>
    fitView?: boolean
    attributionPosition?: string
    onNodeClick?: (event: any, node: Node) => void
    onEdgeClick?: (event: any, edge: Edge) => void
    onEdgeMouseEnter?: (event: any, edge: Edge) => void
    onEdgeMouseLeave?: () => void
    children?: ReactNode
  }

  export function useNodesState(initialNodes: Node[]): [Node[], (nodes: Node[] | ((nodes: Node[]) => Node[])) => void, (changes: any) => void]
  export function useEdgesState(initialEdges: Edge[]): [Edge[], (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void, (changes: any) => void]

  export const Background: ComponentType<BackgroundProps>
  export const Controls: ComponentType<ControlsProps>
  export const MiniMap: ComponentType<MiniMapProps>
  export const Handle: ComponentType<HandleProps>
  export const Position: {
    Top: 'top'
    Right: 'right'
    Bottom: 'bottom'
    Left: 'left'
  }
  export const MarkerType: {
    Arrow: 'arrow'
    ArrowClosed: 'arrowclosed'
  }

  const ReactFlow: ComponentType<ReactFlowProps>
  export default ReactFlow
}
