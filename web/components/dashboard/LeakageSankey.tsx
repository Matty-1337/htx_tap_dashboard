'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'react-flow'
// Note: react-flow v1.0.3 doesn't have dist/style.css, we'll style it ourselves
import { EmptyState } from '@/components/ui/EmptyState'
import clsx from 'clsx'

interface LeakageData {
  sources: Array<{ type: string; amount: number }>
  reasons: Array<{ reason: string; amount: number; source?: string }>
  servers: Array<{ server: string; amount: number; reason?: string }>
}

interface LeakageSankeyProps {
  data?: LeakageData
  onNodeClick?: (nodeId: string, nodeData: any) => void
  onEdgeClick?: (edgeId: string, edgeData: any) => void
  className?: string
}

// Custom node component for leakage sources
const SourceNode = ({ data }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-card p-4 min-w-[120px] text-center"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: `2px solid ${data.color || 'var(--accent-primary)'}`,
        boxShadow: 'var(--shadow-card)',
      }}
      whileHover={{ scale: 1.05, boxShadow: 'var(--glow-accent)' }}
    >
      <div className="text-caption muted mb-1">{data.label}</div>
      <div className="text-body font-bold">${data.amount.toLocaleString()}</div>
      <div className="text-caption muted mt-1">{data.percentage.toFixed(1)}%</div>
      <Handle type="source" position={Position.Right} style={{ background: data.color }} />
    </motion.div>
  )
}

// Custom node component for reasons
const ReasonNode = ({ data }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-card p-3 min-w-[100px] text-center"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--card-border)',
      }}
      whileHover={{ scale: 1.05 }}
    >
      <div className="text-caption font-medium truncate">{data.label}</div>
      <div className="text-body font-semibold mt-1">${data.amount.toLocaleString()}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </motion.div>
  )
}

// Custom node component for servers
const ServerNode = ({ data }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-card p-3 min-w-[100px] text-center"
      style={{
        backgroundColor: data.isHighRisk ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
        border: `1px solid ${data.isHighRisk ? '#ef4444' : 'var(--card-border)'}`,
      }}
      whileHover={{ scale: 1.05 }}
    >
      <div className="text-caption font-medium truncate">{data.label}</div>
      <div className="text-body font-semibold mt-1">${data.amount.toLocaleString()}</div>
      <Handle type="target" position={Position.Left} />
    </motion.div>
  )
}

const nodeTypes = {
  source: SourceNode,
  reason: ReasonNode,
  server: ServerNode,
}

export function LeakageSankey({ data, onNodeClick, onEdgeClick, className }: LeakageSankeyProps) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  // Build Sankey diagram nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!data || !data.sources || data.sources.length === 0) {
      return { nodes: [], edges: [] }
    }

    const totalLeakage = data.sources.reduce((sum, s) => sum + s.amount, 0)
    if (totalLeakage === 0) {
      return { nodes: [], edges: [] }
    }

    const nodes: Node[] = []
    const edges: Edge[] = []

    // LEFT: Source nodes (Voids, Discounts, Removals, etc.)
    const sourceColors: Record<string, string> = {
      'Void': '#ef4444',
      'Discount': '#eab308',
      'Removal': '#f59e0b',
      'Comp': '#3b82f6',
      'Other': '#71717a',
    }

    data.sources.forEach((source, idx) => {
      const x = 50
      const y = 100 + idx * 120
      const color = sourceColors[source.type] || '#71717a'
      const percentage = (source.amount / totalLeakage) * 100

      nodes.push({
        id: `source-${source.type}`,
        type: 'source',
        position: { x, y },
        data: {
          label: source.type,
          amount: source.amount,
          percentage,
          color,
        },
      })
    })

    // MIDDLE: Reason nodes
    const reasonMap = new Map<string, number>()
    data.reasons?.forEach(reason => {
      const key = reason.reason || 'Unknown'
      reasonMap.set(key, (reasonMap.get(key) || 0) + reason.amount)
    })

    const sortedReasons = Array.from(reasonMap.entries())
      .map(([reason, amount]) => ({ reason, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8) // Limit to top 8 reasons

    sortedReasons.forEach((reason, idx) => {
      const x = 350
      const y = 100 + idx * 100
      const percentage = (reason.amount / totalLeakage) * 100

      nodes.push({
        id: `reason-${reason.reason}`,
        type: 'reason',
        position: { x, y },
        data: {
          label: reason.reason,
          amount: reason.amount,
          percentage,
        },
      })

      // Connect sources to reasons (simplified - would need actual mapping)
      data.sources.forEach(source => {
        if (source.type === 'Void' || reason.reason.toLowerCase().includes('void')) {
          edges.push({
            id: `edge-${source.type}-${reason.reason}`,
            source: `source-${source.type}`,
            target: `reason-${reason.reason}`,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: sourceColors[source.type] || '#71717a',
              strokeWidth: Math.max(2, (reason.amount / totalLeakage) * 20),
              opacity: 0.7,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: sourceColors[source.type] || '#71717a',
            },
            data: {
              amount: reason.amount,
              source: source.type,
              reason: reason.reason,
            },
          })
        }
      })
    })

    // RIGHT: Server nodes
    const serverMap = new Map<string, number>()
    data.servers?.forEach(server => {
      const key = server.server || 'Unknown'
      serverMap.set(key, (serverMap.get(key) || 0) + server.amount)
    })

    const sortedServers = Array.from(serverMap.entries())
      .map(([server, amount]) => ({ server, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10) // Top 10 servers

    sortedServers.forEach((server, idx) => {
      const x = 650
      const y = 100 + idx * 80
      const percentage = (server.amount / totalLeakage) * 100
      const isHighRisk = percentage > 10

      nodes.push({
        id: `server-${server.server}`,
        type: 'server',
        position: { x, y },
        data: {
          label: server.server,
          amount: server.amount,
          percentage,
          isHighRisk,
        },
      })

      // Connect reasons to servers (simplified - would need actual mapping)
      sortedReasons.forEach(reason => {
        edges.push({
          id: `edge-${reason.reason}-${server.server}`,
          source: `reason-${reason.reason}`,
          target: `server-${server.server}`,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#6366f1',
            strokeWidth: Math.max(1, (server.amount / totalLeakage) * 15),
            opacity: 0.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6366f1',
          },
          data: {
            amount: server.amount,
            reason: reason.reason,
            server: server.server,
          },
        })
      })
    })

    return { nodes, edges }
  }, [data])

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges)

  // Update nodes/edges when data changes
  useMemo(() => {
    setNodes(nodes)
    setEdges(edges)
  }, [nodes, edges, setNodes, setEdges])

  if (!data || !data.sources || data.sources.length === 0) {
    return (
      <div className={clsx('premium-card p-6', className)}>
        <EmptyState
          title="No Leakage Data Available"
          description="Leakage flow data is not available. Run analysis to generate waste metrics."
        />
      </div>
    )
  }

  const totalLeakage = data.sources.reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className={clsx('premium-card p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-section-title mb-1">Revenue Flow Analysis</h3>
          <p className="text-caption muted">Visual flow of where money is leaking</p>
        </div>
        <div className="text-body font-semibold">
          Total Leakage: <span style={{ color: 'var(--status-danger)' }}>${totalLeakage.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ height: '600px', width: '100%', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          onNodeClick={(_, node) => onNodeClick?.(node.id, node.data)}
          onEdgeClick={(_, edge) => onEdgeClick?.(edge.id, edge.data)}
          onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdge(null)}
        >
          <Background color="var(--text-muted)" gap={16} size={1} opacity={0.1} />
          <Controls
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)',
            }}
          />
        </ReactFlow>
      </div>

      {/* Edge Tooltip */}
      {hoveredEdge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute pointer-events-none"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            boxShadow: 'var(--shadow-elevated)',
            zIndex: 1000,
          }}
        >
          {/* Tooltip content would be positioned dynamically */}
        </motion.div>
      )}
    </div>
  )
}
