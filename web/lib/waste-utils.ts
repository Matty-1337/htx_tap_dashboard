import { findColumn } from './data-utils'

// Get waste breakdown by source type
export function getWasteSources(data: any[]): Array<{ type: string; amount: number }> {
  if (!data || data.length === 0) return []

  const voidKey = findColumn(data, ['void', 'voided', 'void_amount', 'void_revenue', 'Void_Amount'])
  const discountKey = findColumn(data, ['discount', 'discounted', 'discount_amount', 'discount_revenue'])
  const compKey = findColumn(data, ['comp', 'comped', 'comp_amount', 'comp_revenue'])
  const removalKey = findColumn(data, ['removal', 'removed', 'removal_amount', 'removal_revenue'])

  const sources: Array<{ type: string; amount: number }> = []

  if (voidKey) {
    const voidTotal = data
      .map(row => typeof row[voidKey] === 'number' ? row[voidKey] : 0)
      .reduce((sum, val) => sum + val, 0)
    if (voidTotal > 0) sources.push({ type: 'Void', amount: voidTotal })
  }

  if (discountKey) {
    const discountTotal = data
      .map(row => typeof row[discountKey] === 'number' ? row[discountKey] : 0)
      .reduce((sum, val) => sum + val, 0)
    if (discountTotal > 0) sources.push({ type: 'Discount', amount: discountTotal })
  }

  if (compKey) {
    const compTotal = data
      .map(row => typeof row[compKey] === 'number' ? row[compKey] : 0)
      .reduce((sum, val) => sum + val, 0)
    if (compTotal > 0) sources.push({ type: 'Comp', amount: compTotal })
  }

  if (removalKey) {
    const removalTotal = data
      .map(row => typeof row[removalKey] === 'number' ? row[removalKey] : 0)
      .reduce((sum, val) => sum + val, 0)
    if (removalTotal > 0) sources.push({ type: 'Removal', amount: removalTotal })
  }

  // If no specific sources found, use total waste
  if (sources.length === 0) {
    const wasteKey = findColumn(data, ['waste', 'total_waste', 'leakage', 'loss'])
    if (wasteKey) {
      const wasteTotal = data
        .map(row => typeof row[wasteKey] === 'number' ? row[wasteKey] : 0)
        .reduce((sum, val) => sum + val, 0)
      if (wasteTotal > 0) sources.push({ type: 'Other', amount: wasteTotal })
    }
  }

  return sources.sort((a, b) => b.amount - a.amount)
}

// Get leakage by reason with server mapping
export function getLeakageByReasonWithServer(data: any[]): {
  reasons: Array<{ reason: string; amount: number; source?: string }>
  servers: Array<{ server: string; amount: number; reason?: string }>
} {
  if (!data || data.length === 0) {
    return { reasons: [], servers: [] }
  }

  const reasonKey = findColumn(data, ['reason', 'description', 'note', 'comment', 'void_reason', 'removal_reason', 'Reason'])
  const serverKey = findColumn(data, ['server', 'server_name', 'employee', 'Server'])
  const amountKey = findColumn(data, ['amount', 'value', 'waste', 'total_waste', 'revenue', 'Void_Amount'])

  if (!amountKey) {
    return { reasons: [], servers: [] }
  }

  const reasonMap = new Map<string, number>()
  const serverMap = new Map<string, number>()
  const serverReasonMap = new Map<string, Map<string, number>>()

  data.forEach(row => {
    const amount = typeof row[amountKey] === 'number' ? row[amountKey] : 0
    if (amount <= 0) return

    const reason = reasonKey ? (row[reasonKey] || 'Unknown') : 'Unknown'
    const server = serverKey ? (row[serverKey] || 'Unknown') : 'Unknown'

    // Aggregate by reason
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + amount)

    // Aggregate by server
    serverMap.set(server, (serverMap.get(server) || 0) + amount)

    // Track server-reason mapping
    if (!serverReasonMap.has(server)) {
      serverReasonMap.set(server, new Map())
    }
    const serverReasons = serverReasonMap.get(server)!
    serverReasons.set(reason, (serverReasons.get(reason) || 0) + amount)
  })

  const reasons = Array.from(reasonMap.entries())
    .map(([reason, amount]) => ({ reason, amount }))
    .sort((a, b) => b.amount - a.amount)

  const servers = Array.from(serverMap.entries())
    .map(([server, amount]) => ({ server, amount }))
    .sort((a, b) => b.amount - a.amount)

  return { reasons, servers }
}

// Get server waste efficiency ranking
export function getServerWasteRanking(data: any[]): Array<{
  Server: string
  Leakage: number
  Void_Rate_Pct: number
  Trend?: number
}> {
  if (!data || data.length === 0) return []

  const serverKey = findColumn(data, ['server', 'server_name', 'employee', 'Server'])
  const voidKey = findColumn(data, ['void', 'voided', 'void_amount', 'void_revenue', 'Void_Amount'])
  const revenueKey = findColumn(data, ['revenue', 'sales', 'Revenue'])
  const voidRateKey = findColumn(data, ['void_rate', 'void_rate_pct', 'Void_Rate_Pct'])

  if (!serverKey) return []

  const serverMap = new Map<string, {
    leakage: number
    revenue: number
    voidRate: number
    count: number
  }>()

  data.forEach(row => {
    const server = row[serverKey] || 'Unknown'
    const voidAmount = voidKey && typeof row[voidKey] === 'number' ? row[voidKey] : 0
    const revenue = revenueKey && typeof row[revenueKey] === 'number' ? row[revenueKey] : 0
    const voidRate = voidRateKey && typeof row[voidRateKey] === 'number' ? row[voidRateKey] : 0

    const existing = serverMap.get(server) || { leakage: 0, revenue: 0, voidRate: 0, count: 0 }
    serverMap.set(server, {
      leakage: existing.leakage + voidAmount,
      revenue: existing.revenue + revenue,
      voidRate: existing.voidRate + voidRate,
      count: existing.count + 1,
    })
  })

  return Array.from(serverMap.entries())
    .map(([Server, stats]) => ({
      Server,
      Leakage: stats.leakage,
      Void_Rate_Pct: stats.count > 0 ? stats.voidRate / stats.count : 0,
    }))
    .sort((a, b) => b.Leakage - a.Leakage)
}

// Get time-based void patterns
export function getTimeBasedVoidPatterns(data: any[]): {
  byHour: Array<{ hour: number; amount: number; count: number }>
  byDay: Array<{ day: string; amount: number; count: number }>
} {
  if (!data || data.length === 0) {
    return { byHour: [], byDay: [] }
  }

  const timestampKey = findColumn(data, ['timestamp', 'date', 'time', 'created_at', 'Date'])
  const voidKey = findColumn(data, ['void', 'voided', 'void_amount', 'void_revenue', 'Void_Amount'])

  if (!timestampKey || !voidKey) {
    return { byHour: [], byDay: [] }
  }

  const hourMap = new Map<number, { amount: number; count: number }>()
  const dayMap = new Map<string, { amount: number; count: number }>()

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  data.forEach(row => {
    const voidAmount = typeof row[voidKey] === 'number' ? row[voidKey] : 0
    if (voidAmount <= 0) return

    const timestamp = row[timestampKey]
    if (!timestamp) return

    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return

    const hour = date.getHours()
    const day = dayNames[date.getDay()]

    // Aggregate by hour
    const hourStats = hourMap.get(hour) || { amount: 0, count: 0 }
    hourMap.set(hour, {
      amount: hourStats.amount + voidAmount,
      count: hourStats.count + 1,
    })

    // Aggregate by day
    const dayStats = dayMap.get(day) || { amount: 0, count: 0 }
    dayMap.set(day, {
      amount: dayStats.amount + voidAmount,
      count: dayStats.count + 1,
    })
  })

  const byHour = Array.from(hourMap.entries())
    .map(([hour, stats]) => ({ hour, ...stats }))
    .sort((a, b) => a.hour - b.hour)

  const byDay = Array.from(dayMap.entries())
    .map(([day, stats]) => ({ day, ...stats }))
    .sort((a, b) => {
      const order = dayNames.indexOf(a.day) - dayNames.indexOf(b.day)
      return order
    })

  return { byHour, byDay }
}

// Detect suspicious patterns
export function detectSuspiciousPatterns(data: any[]): Array<{
  id: string
  type: 'repeated_voids' | 'late_night_spike' | 'outlier_behavior' | 'pattern_anomaly'
  title: string
  description: string
  server?: string
  estimatedImpact: number
  recommendedAction: string
  priority: 'high' | 'medium' | 'low'
}> {
  if (!data || data.length === 0) return []

  const alerts: Array<{
    id: string
    type: 'repeated_voids' | 'late_night_spike' | 'outlier_behavior' | 'pattern_anomaly'
    title: string
    description: string
    server?: string
    estimatedImpact: number
    recommendedAction: string
    priority: 'high' | 'medium' | 'low'
  }> = []

  const serverKey = findColumn(data, ['server', 'server_name', 'employee', 'Server'])
  const voidKey = findColumn(data, ['void', 'voided', 'void_amount', 'void_revenue', 'Void_Amount'])
  const timestampKey = findColumn(data, ['timestamp', 'date', 'time', 'created_at', 'Date'])

  if (!serverKey || !voidKey) return []

  // Pattern 1: Repeated voids by same server
  const serverVoidMap = new Map<string, { count: number; amount: number }>()
  data.forEach(row => {
    const server = row[serverKey] || 'Unknown'
    const voidAmount = typeof row[voidKey] === 'number' ? row[voidKey] : 0
    if (voidAmount > 0) {
      const existing = serverVoidMap.get(server) || { count: 0, amount: 0 }
      serverVoidMap.set(server, {
        count: existing.count + 1,
        amount: existing.amount + voidAmount,
      })
    }
  })

  serverVoidMap.forEach((stats, server) => {
    if (stats.count >= 10 && stats.amount > 500) {
      alerts.push({
        id: `repeated-${server}`,
        type: 'repeated_voids',
        title: `Repeated Voids by ${server}`,
        description: `${server} has ${stats.count} void transactions totaling $${stats.amount.toLocaleString()}. This pattern may indicate training needs or process issues.`,
        server,
        estimatedImpact: stats.amount,
        recommendedAction: `Schedule a coaching session with ${server} to review void procedures and identify root causes.`,
        priority: stats.amount > 1000 ? 'high' : 'medium',
      })
    }
  })

  // Pattern 2: Late night spikes
  if (timestampKey) {
    const lateNightVoids = data.filter(row => {
      const timestamp = row[timestampKey]
      if (!timestamp) return false
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return false
      const hour = date.getHours()
      return hour >= 22 || hour <= 2 // 10 PM - 2 AM
    })

    const lateNightTotal = lateNightVoids.reduce((sum, row) => {
      const voidAmount = typeof row[voidKey] === 'number' ? row[voidKey] : 0
      return sum + voidAmount
    }, 0)

    if (lateNightTotal > 1000) {
      alerts.push({
        id: 'late-night-spike',
        type: 'late_night_spike',
        title: 'Late Night Void Spike',
        description: `Voids during late night hours (10 PM - 2 AM) total $${lateNightTotal.toLocaleString()}. This may indicate staffing or inventory issues during closing.`,
        estimatedImpact: lateNightTotal,
        recommendedAction: 'Review closing procedures and late-night staffing levels. Consider adjusting inventory ordering to reduce late-night waste.',
        priority: lateNightTotal > 2000 ? 'high' : 'medium',
      })
    }
  }

  // Pattern 3: Outlier behavior (servers with void rates > 2x average)
  const serverRanking = getServerWasteRanking(data)
  if (serverRanking.length > 0) {
    const avgVoidRate = serverRanking.reduce((sum, s) => sum + s.Void_Rate_Pct, 0) / serverRanking.length
    const outliers = serverRanking.filter(s => s.Void_Rate_Pct > avgVoidRate * 2 && s.Leakage > 500)

    outliers.forEach(server => {
      alerts.push({
        id: `outlier-${server.Server}`,
        type: 'outlier_behavior',
        title: `Outlier Behavior: ${server.Server}`,
        description: `${server.Server} has a void rate of ${server.Void_Rate_Pct.toFixed(1)}% (${(avgVoidRate * 2).toFixed(1)}% above average) with $${server.Leakage.toLocaleString()} in leakage.`,
        server: server.Server,
        estimatedImpact: server.Leakage,
        recommendedAction: `Review ${server.Server}'s transaction patterns and provide targeted coaching on order accuracy and void procedures.`,
        priority: server.Leakage > 1000 ? 'high' : 'medium',
      })
    })
  }

  return alerts
}
