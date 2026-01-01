'use client'

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { ChartCard } from './ChartCard'
import { formatCurrency, formatNumber } from '@/lib/ui'

interface MenuQuadrantChartProps {
  data: Array<{
    Item: string
    Category: string | null
    x: number
    y: number
    Revenue: number
    Count: number
    Volatility: number
    AvgPrice: number
  }>
  title?: string
  subtitle?: string
  onPointClick?: (item: string) => void
  className?: string
}

const COLORS = ['var(--primary)', 'var(--secondary)', 'var(--accent)', 'var(--muted)']

export function MenuQuadrantChart({
  data,
  title = 'Menu Engineering Quadrant',
  subtitle,
  onPointClick,
  className,
}: MenuQuadrantChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Calculate medians for quadrant lines
  const xValues = data.map(d => d.x).filter(v => v > 0)
  const yValues = data.map(d => d.y).filter(v => v > 0)
  
  const xMedian = xValues.length > 0 
    ? xValues.sort((a, b) => a - b)[Math.floor(xValues.length / 2)]
    : 0
  const yMedian = yValues.length > 0
    ? yValues.sort((a, b) => a - b)[Math.floor(yValues.length / 2)]
    : 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload
      return (
        <div className="p-3 rounded-md shadow-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text)' }}>
          <p className="font-semibold mb-2">{point.Item}</p>
          {point.Category && <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Category: {point.Category}</p>}
          <p className="text-xs">Revenue: {formatCurrency(point.Revenue)}</p>
          <p className="text-xs">Count: {formatNumber(point.Count)}</p>
          <p className="text-xs">Avg Price: {formatCurrency(point.AvgPrice)}</p>
          {point.Volatility > 0 && <p className="text-xs">Volatility: {point.Volatility.toFixed(2)}</p>}
        </div>
      )
    }
    return null
  }

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name="Popularity"
            label={{ value: 'Popularity (Count)', position: 'insideBottom', offset: -5 }}
            style={{ fontSize: '12px', fill: 'var(--muted)' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Avg Price"
            label={{ value: 'Avg Price ($)', angle: -90, position: 'insideLeft' }}
            style={{ fontSize: '12px', fill: 'var(--muted)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={xMedian} stroke="var(--muted)" strokeDasharray="2 2" opacity={0.5} />
          <ReferenceLine y={yMedian} stroke="var(--muted)" strokeDasharray="2 2" opacity={0.5} />
          <Scatter
            data={data}
            dataKey="y"
            onClick={(data: any) => {
              if (onPointClick && data?.payload) {
                onPointClick(data.payload.Item)
              }
            }}
            style={{ cursor: onPointClick ? 'pointer' : 'default' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      {/* Quadrant Labels */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs" style={{ color: 'var(--muted)' }}>
        <div className="text-center">
          <div className="font-semibold" style={{ color: 'var(--primary)' }}>Promote</div>
          <div>High popularity, high avg price</div>
        </div>
        <div className="text-center">
          <div className="font-semibold" style={{ color: 'var(--secondary)' }}>Reprice / Reposition</div>
          <div>Low popularity, high avg price</div>
        </div>
        <div className="text-center">
          <div className="font-semibold" style={{ color: 'var(--accent)' }}>Optimize</div>
          <div>High popularity, low avg price</div>
        </div>
        <div className="text-center">
          <div className="font-semibold" style={{ color: 'var(--muted)' }}>Consider Removing</div>
          <div>Low popularity, low avg price</div>
        </div>
      </div>
    </ChartCard>
  )
}
