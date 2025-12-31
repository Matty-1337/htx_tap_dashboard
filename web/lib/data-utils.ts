/**
 * Data utility functions for deriving chart data from tables
 */

// Find column by case-insensitive match
export function findColumn(data: any[], patterns: string[]): string | null {
  if (!data || data.length === 0) return null
  
  const keys = Object.keys(data[0])
  for (const pattern of patterns) {
    const found = keys.find(key => key.toLowerCase().includes(pattern.toLowerCase()))
    if (found) return found
  }
  return null
}

// Group by key and sum value
export function groupBySum(data: any[], groupKey: string, valueKey: string): any[] {
  if (!data || data.length === 0) return []
  
  const grouped: Record<string, number> = {}
  
  data.forEach(row => {
    const group = row[groupKey]
    const value = typeof row[valueKey] === 'number' ? row[valueKey] : 0
    
    if (group !== null && group !== undefined) {
      grouped[group] = (grouped[group] || 0) + value
    }
  })
  
  return Object.entries(grouped).map(([name, value]) => ({
    [groupKey]: name,
    [valueKey]: value,
  }))
}

// Get status breakdown from employee performance data
export function getStatusBreakdown(data: any[]): any[] {
  if (!data || data.length === 0) return []
  
  const statusKey = findColumn(data, ['status'])
  if (!statusKey) return []
  
  // Count occurrences of each status
  const statusCounts: Record<string, number> = {}
  data.forEach(row => {
    const status = row[statusKey]
    if (status !== null && status !== undefined) {
      statusCounts[status] = (statusCounts[status] || 0) + 1
    }
  })
  
  return Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }))
}

// Get top waste servers
export function getTopWasteServers(data: any[], limit: number = 8): any[] {
  if (!data || data.length === 0) return []
  
  const serverKey = findColumn(data, ['server', 'employee', 'name'])
  const wasteKey = findColumn(data, ['total_waste', 'waste_rate_pct', 'revenue'])
  
  if (!serverKey || !wasteKey) return []
  
  const sorted = [...data]
    .filter(row => row[serverKey] && typeof row[wasteKey] === 'number')
    .sort((a, b) => (b[wasteKey] || 0) - (a[wasteKey] || 0))
    .slice(0, limit)
  
  return sorted.map(row => ({
    Server: row[serverKey],
    Waste: row[wasteKey] || 0,
  }))
}

// Filter data by multiple criteria
export function filterData(
  data: any[],
  filters: {
    selectedServer?: string
    selectedStatus?: string
    selectedCategory?: string
  }
): any[] {
  if (!data || data.length === 0) return []
  if (!filters.selectedServer && !filters.selectedStatus && !filters.selectedCategory) {
    return data
  }
  
  return data.filter(row => {
    if (filters.selectedServer) {
      const serverKey = findColumn([row], ['server', 'employee', 'name'])
      if (serverKey && row[serverKey] !== filters.selectedServer) {
        return false
      }
    }
    
    if (filters.selectedStatus) {
      const statusKey = findColumn([row], ['status'])
      if (statusKey && row[statusKey] !== filters.selectedStatus) {
        return false
      }
    }
    
    if (filters.selectedCategory) {
      const categoryKey = findColumn([row], ['category', 'type'])
      if (categoryKey && row[categoryKey] !== filters.selectedCategory) {
        return false
      }
    }
    
    return true
  })
}

// Calculate KPI from filtered data
export function calculateKpiFromData(
  data: any[],
  kpiKey: string,
  valueKey?: string
): number | null {
  if (!data || data.length === 0) return null
  
  const key = valueKey || findColumn(data, ['revenue', 'value', 'amount', 'total'])
  if (!key) return null
  
  const values = data
    .map(row => row[key])
    .filter(val => typeof val === 'number' && !isNaN(val))
  
  if (values.length === 0) return null
  
  // Sum for revenue/value KPIs, average for rates
  if (kpiKey.toLowerCase().includes('revenue') || kpiKey.toLowerCase().includes('value')) {
    return values.reduce((sum, val) => sum + val, 0)
  }
  
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

// Get waste breakdown by type (Void, Discount, Removal)
export function getWasteBreakdown(data: any[]): Array<{ type: string; amount: number; percentage?: number }> {
  if (!data || data.length === 0) return []
  
  // Try to find void, discount, removal columns
  const voidKey = findColumn(data, ['void', 'voided', 'void_amount', 'void_revenue'])
  const discountKey = findColumn(data, ['discount', 'discounted', 'discount_amount', 'discount_revenue'])
  const removalKey = findColumn(data, ['removal', 'removed', 'removal_amount', 'removal_revenue'])
  
  const breakdown: Array<{ type: string; amount: number }> = []
  
  if (voidKey) {
    const voidTotal = data
      .map(row => typeof row[voidKey] === 'number' ? row[voidKey] : 0)
      .reduce((sum, val) => sum + val, 0)
    if (voidTotal > 0) breakdown.push({ type: 'Void', amount: voidTotal })
  }
  
  if (discountKey) {
    const discountTotal = data
      .map(row => typeof row[discountKey] === 'number' ? row[discountKey] : 0)
      .reduce((sum, val) => sum + val, 0)
    if (discountTotal > 0) breakdown.push({ type: 'Discount', amount: discountTotal })
  }
  
  if (removalKey) {
    const removalTotal = data
      .map(row => typeof row[removalKey] === 'number' ? row[removalKey] : 0)
      .reduce((sum, val) => sum + val, 0)
    if (removalTotal > 0) breakdown.push({ type: 'Removal', amount: removalTotal })
  }
  
  // Calculate percentages if we have multiple types
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0)
  if (total > 0 && breakdown.length > 1) {
    return breakdown.map(item => ({
      ...item,
      percentage: (item.amount / total) * 100
    }))
  }
  
  return breakdown
}

// Get leakage by reason (top reasons)
export function getLeakageByReason(data: any[], limit: number = 10): Array<{ reason: string; amount: number }> {
  if (!data || data.length === 0) return []
  
  // Try to find reason/description columns
  const reasonKey = findColumn(data, ['reason', 'description', 'note', 'comment', 'void_reason', 'removal_reason'])
  const amountKey = findColumn(data, ['amount', 'value', 'waste', 'total_waste', 'revenue'])
  
  if (!reasonKey || !amountKey) return []
  
  // Group by reason and sum amounts
  const grouped: Record<string, number> = {}
  
  data.forEach(row => {
    const reason = row[reasonKey]
    const amount = typeof row[amountKey] === 'number' ? row[amountKey] : 0
    
    if (reason && amount > 0) {
      grouped[reason] = (grouped[reason] || 0) + amount
    }
  })
  
  // Sort by amount and limit
  return Object.entries(grouped)
    .map(([reason, amount]) => ({ reason, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

// Get waste grouped by category
export function getWasteByCategory(data: any[]): Array<{ category: string; amount: number; count: number }> {
  if (!data || data.length === 0) return []
  
  const categoryKey = findColumn(data, ['category', 'type', 'item_category', 'product_category'])
  const amountKey = findColumn(data, ['amount', 'value', 'waste', 'total_waste', 'revenue'])
  
  if (!categoryKey) return []
  
  const grouped: Record<string, { amount: number; count: number }> = {}
  
  data.forEach(row => {
    const category = row[categoryKey] || 'Other'
    const amount = amountKey && typeof row[amountKey] === 'number' ? row[amountKey] : 0
    
    if (!grouped[category]) {
      grouped[category] = { amount: 0, count: 0 }
    }
    
    grouped[category].amount += amount
    grouped[category].count += 1
  })
  
  return Object.entries(grouped)
    .map(([category, { amount, count }]) => ({ category, amount, count }))
    .sort((a, b) => b.amount - a.amount)
}

// Get trend indicator (placeholder if no historical data)
export function getTrendIndicator(current: number | null, previous: number | null): { symbol: string; value: number | null; label: string } {
  if (current === null || previous === null || previous === 0) {
    return { symbol: '—', value: null, label: 'No comparison data' }
  }
  
  const change = ((current - previous) / previous) * 100
  const symbol = change > 0 ? '▲' : change < 0 ? '▼' : '—'
  
  return {
    symbol,
    value: Math.abs(change),
    label: change > 0 ? 'Increase' : change < 0 ? 'Decrease' : 'No change'
  }
}

// Get team leaderboard (top servers by revenue)
export function getTeamLeaderboard(data: any[], limit: number = 10, sortBy: 'Revenue' | 'Transactions' | 'Void_Rate_Pct' = 'Revenue'): any[] {
  if (!data || data.length === 0) return []
  
  const serverKey = findColumn(data, ['server', 'employee', 'name'])
  const revenueKey = findColumn(data, ['revenue', 'net_price', 'sales'])
  const transactionsKey = findColumn(data, ['transactions', 'count', 'orders'])
  const voidRateKey = findColumn(data, ['void_rate_pct', 'void_rate', 'waste_rate_pct'])
  
  if (!serverKey || !revenueKey) return []
  
  // Create enriched rows with all available metrics
  const enriched = data.map(row => ({
    Server: row[serverKey],
    Revenue: typeof row[revenueKey] === 'number' ? row[revenueKey] : 0,
    Transactions: transactionsKey && typeof row[transactionsKey] === 'number' ? row[transactionsKey] : 0,
    Void_Rate_Pct: voidRateKey && typeof row[voidRateKey] === 'number' ? row[voidRateKey] : 0,
    Void_Amount: findColumn([row], ['void_amount', 'void']) && typeof row[findColumn([row], ['void_amount', 'void'])] === 'number' 
      ? row[findColumn([row], ['void_amount', 'void'])] 
      : 0,
  }))
  
  // Sort by selected column
  const sorted = [...enriched].sort((a, b) => {
    const aVal = a[sortBy] || 0
    const bVal = b[sortBy] || 0
    return bVal - aVal
  })
  
  return sorted.slice(0, limit)
}

// Get server snapshot (detailed metrics for a specific server)
export function getServerSnapshot(data: any[], serverName: string): any | null {
  if (!data || data.length === 0 || !serverName) return null
  
  const serverKey = findColumn(data, ['server', 'employee', 'name'])
  if (!serverKey) return null
  
  const serverRow = data.find(row => {
    const server = row[serverKey]
    return server && server.toString().toLowerCase() === serverName.toLowerCase()
  })
  
  if (!serverRow) return null
  
  const revenueKey = findColumn(data, ['revenue', 'net_price', 'sales'])
  const transactionsKey = findColumn(data, ['transactions', 'count', 'orders'])
  const voidAmountKey = findColumn(data, ['void_amount', 'void'])
  const voidRateKey = findColumn(data, ['void_rate_pct', 'void_rate', 'waste_rate_pct'])
  
  return {
    Server: serverRow[serverKey],
    Revenue: revenueKey && typeof serverRow[revenueKey] === 'number' ? serverRow[revenueKey] : 0,
    Transactions: transactionsKey && typeof serverRow[transactionsKey] === 'number' ? serverRow[transactionsKey] : 0,
    Void_Amount: voidAmountKey && typeof serverRow[voidAmountKey] === 'number' ? serverRow[voidAmountKey] : 0,
    Void_Rate_Pct: voidRateKey && typeof serverRow[voidRateKey] === 'number' ? serverRow[voidRateKey] : 0,
  }
}

// Get team averages (for comparison)
export function getTeamAverages(data: any[]): any {
  if (!data || data.length === 0) {
    return {
      avgRevenue: 0,
      avgTransactions: 0,
      avgVoidRate: 0,
      avgVoidAmount: 0,
    }
  }
  
  const revenueKey = findColumn(data, ['revenue', 'net_price', 'sales'])
  const transactionsKey = findColumn(data, ['transactions', 'count', 'orders'])
  const voidAmountKey = findColumn(data, ['void_amount', 'void'])
  const voidRateKey = findColumn(data, ['void_rate_pct', 'void_rate', 'waste_rate_pct'])
  
  const revenues = revenueKey ? data.map(r => typeof r[revenueKey] === 'number' ? r[revenueKey] : 0).filter(v => v > 0) : []
  const transactions = transactionsKey ? data.map(r => typeof r[transactionsKey] === 'number' ? r[transactionsKey] : 0).filter(v => v > 0) : []
  const voidRates = voidRateKey ? data.map(r => typeof r[voidRateKey] === 'number' ? r[voidRateKey] : 0).filter(v => v > 0) : []
  const voidAmounts = voidAmountKey ? data.map(r => typeof r[voidAmountKey] === 'number' ? r[voidAmountKey] : 0).filter(v => v > 0) : []
  
  return {
    avgRevenue: revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0,
    avgTransactions: transactions.length > 0 ? transactions.reduce((a, b) => a + b, 0) / transactions.length : 0,
    avgVoidRate: voidRates.length > 0 ? voidRates.reduce((a, b) => a + b, 0) / voidRates.length : 0,
    avgVoidAmount: voidAmounts.length > 0 ? voidAmounts.reduce((a, b) => a + b, 0) / voidAmounts.length : 0,
  }
}

// Get coaching insights for a server (non-accusatory, action-oriented)
export function getCoachingInsights(snapshot: any, teamAverages: any, wasteData?: any[]): Array<{ title: string; rationale: string; priority: 'high' | 'medium' | 'low' }> {
  if (!snapshot) return []
  
  const insights: Array<{ title: string; rationale: string; priority: 'high' | 'medium' | 'low' }> = []
  
  // Insight 1: Void rate comparison
  if (snapshot.Void_Rate_Pct > 0 && teamAverages.avgVoidRate > 0) {
    const voidRateDiff = snapshot.Void_Rate_Pct - teamAverages.avgVoidRate
    if (voidRateDiff > 2) {
      insights.push({
        title: 'Coaching opportunity: reduce void rate',
        rationale: `Patterns suggest void rate is ${voidRateDiff.toFixed(1)}% above team average. This warrants a quick review of comps/removal flow and portion consistency.`,
        priority: voidRateDiff > 5 ? 'high' : 'medium'
      })
    } else if (voidRateDiff < -1) {
      insights.push({
        title: 'Strong performance: void rate below average',
        rationale: `Void rate is ${Math.abs(voidRateDiff).toFixed(1)}% below team average. Consider sharing best practices with the team.`,
        priority: 'low'
      })
    }
  }
  
  // Insight 2: Revenue performance
  if (snapshot.Revenue > 0 && teamAverages.avgRevenue > 0) {
    const revenueDiff = ((snapshot.Revenue - teamAverages.avgRevenue) / teamAverages.avgRevenue) * 100
    if (revenueDiff < -10) {
      insights.push({
        title: 'Coaching opportunity: increase revenue per shift',
        rationale: `Revenue is ${Math.abs(revenueDiff).toFixed(0)}% below team average. Patterns suggest a coaching opportunity to focus on upselling and table turnover.`,
        priority: 'medium'
      })
    }
  }
  
  // Insight 3: Transaction volume
  if (snapshot.Transactions > 0 && teamAverages.avgTransactions > 0) {
    const transactionDiff = ((snapshot.Transactions - teamAverages.avgTransactions) / teamAverages.avgTransactions) * 100
    if (transactionDiff < -15) {
      insights.push({
        title: 'Coaching opportunity: improve transaction volume',
        rationale: `Transaction count is ${Math.abs(transactionDiff).toFixed(0)}% below team average. This warrants a quick review of service speed and order flow.`,
        priority: 'medium'
      })
    }
  }
  
  // Insight 4: Void amount focus
  if (snapshot.Void_Amount > 100) {
    insights.push({
      title: 'Coaching focus: reduce void amount',
      rationale: `Void amount of $${snapshot.Void_Amount.toFixed(0)} suggests a coaching opportunity to tighten comps/removes/void flow while keeping service smooth.`,
      priority: snapshot.Void_Amount > 500 ? 'high' : 'medium'
    })
  }
  
  // Insight 5: Top leakage reasons (if waste data available)
  if (wasteData && wasteData.length > 0) {
    const reasonKey = findColumn(wasteData, ['reason', 'void_reason', 'removal_reason'])
    const serverKey = findColumn(wasteData, ['server', 'employee'])
    const amountKey = findColumn(wasteData, ['void_amount', 'amount'])
    
    if (reasonKey && serverKey && amountKey) {
      const serverWaste = wasteData.filter(row => {
        const server = row[serverKey]
        return server && server.toString().toLowerCase() === snapshot.Server?.toString().toLowerCase()
      })
      
      if (serverWaste.length > 0) {
        const topReasons = getLeakageByReason(serverWaste, 3)
        if (topReasons.length > 0) {
          insights.push({
            title: 'Coaching focus: address top leakage reasons',
            rationale: `Top leakage reasons: ${topReasons.map(r => r.reason).join(', ')}. Patterns suggest a coaching opportunity to review these specific areas.`,
            priority: 'medium'
          })
        }
      }
    }
  }
  
  return insights.slice(0, 5) // Limit to 5 insights
}

// Get chaos items (highest volatility)
export function getChaosItems(data: any[], limit: number = 15, minCount: number = 0): any[] {
  if (!data || data.length === 0) return []
  
  const itemKey = findColumn(data, ['item', 'item_name', 'menu_item', 'product'])
  const volatilityKey = findColumn(data, ['volatility', 'volatility_pct'])
  const countKey = findColumn(data, ['count', 'transactions', 'orders'])
  
  if (!itemKey || !volatilityKey) return []
  
  // Filter by minimum count if specified
  let filtered = data
  if (minCount > 0 && countKey) {
    filtered = data.filter(row => {
      const count = typeof row[countKey] === 'number' ? row[countKey] : 0
      return count >= minCount
    })
  }
  
  // Sort by volatility descending
  const sorted = [...filtered].sort((a, b) => {
    const aVol = typeof a[volatilityKey] === 'number' ? a[volatilityKey] : 0
    const bVol = typeof b[volatilityKey] === 'number' ? b[volatilityKey] : 0
    return bVol - aVol
  })
  
  return sorted.slice(0, limit).map(row => ({
    Item: row[itemKey],
    Volatility: typeof row[volatilityKey] === 'number' ? row[volatilityKey] : 0,
    Count: countKey && typeof row[countKey] === 'number' ? row[countKey] : 0,
    Revenue: findColumn([row], ['revenue', 'net_price', 'sales']) && typeof row[findColumn([row], ['revenue', 'net_price', 'sales'])] === 'number'
      ? row[findColumn([row], ['revenue', 'net_price', 'sales'])]
      : 0,
  }))
}

// Classify menu items into Stars/Monitor/Investigate/Remove buckets
export function classifyMenuItems(data: any[]): {
  stars: any[]
  monitor: any[]
  investigate: any[]
  remove: any[]
} {
  if (!data || data.length === 0) {
    return { stars: [], monitor: [], investigate: [], remove: [] }
  }
  
  const itemKey = findColumn(data, ['item', 'item_name', 'menu_item', 'product'])
  const revenueKey = findColumn(data, ['revenue', 'net_price', 'sales'])
  const countKey = findColumn(data, ['count', 'transactions', 'orders'])
  const volatilityKey = findColumn(data, ['volatility', 'volatility_pct'])
  
  if (!itemKey || !revenueKey || !countKey) {
    return { stars: [], monitor: [], investigate: [], remove: [] }
  }
  
  // Extract numeric values
  const items = data.map(row => ({
    Item: row[itemKey],
    Revenue: typeof row[revenueKey] === 'number' ? row[revenueKey] : 0,
    Count: typeof row[countKey] === 'number' ? row[countKey] : 0,
    Volatility: volatilityKey && typeof row[volatilityKey] === 'number' ? row[volatilityKey] : 0,
    Category: findColumn([row], ['category', 'item_category']) ? row[findColumn([row], ['category', 'item_category'])] : null,
  }))
  
  // Calculate percentiles
  const revenues = items.map(i => i.Revenue).filter(v => v > 0).sort((a, b) => a - b)
  const counts = items.map(i => i.Count).filter(v => v > 0).sort((a, b) => a - b)
  const volatilities = items.map(i => i.Volatility).filter(v => v > 0).sort((a, b) => a - b)
  
  const getPercentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0
    const index = Math.floor(arr.length * p)
    return arr[Math.min(index, arr.length - 1)]
  }
  
  const revenue_p50 = getPercentile(revenues, 0.5)
  const revenue_p75 = getPercentile(revenues, 0.75)
  const count_p50 = getPercentile(counts, 0.5)
  const count_p75 = getPercentile(counts, 0.75)
  const volatility_p50 = volatilities.length > 0 ? getPercentile(volatilities, 0.5) : 0
  const volatility_p75 = volatilities.length > 0 ? getPercentile(volatilities, 0.75) : 0
  
  // Classify items
  const stars: any[] = []
  const monitor: any[] = []
  const investigate: any[] = []
  const remove: any[] = []
  
  items.forEach(item => {
    const isHighRevenue = item.Revenue >= revenue_p75
    const isMedRevenue = item.Revenue >= revenue_p50 && item.Revenue < revenue_p75
    const isLowRevenue = item.Revenue < revenue_p50
    
    const isHighCount = item.Count >= count_p75
    const isMedCount = item.Count >= count_p50 && item.Count < count_p75
    const isLowCount = item.Count < count_p50
    
    const isHighVolatility = item.Volatility >= volatility_p75
    const isMedVolatility = item.Volatility >= volatility_p50 && item.Volatility < volatility_p75
    const isLowVolatility = item.Volatility < volatility_p50 || item.Volatility === 0
    
    // Stars: high Revenue, high Count, low Volatility
    if (isHighRevenue && isHighCount && isLowVolatility) {
      stars.push(item)
    }
    // Monitor: high Revenue, low Count OR medium Volatility
    else if ((isHighRevenue && isLowCount) || (isHighRevenue && isMedVolatility)) {
      monitor.push(item)
    }
    // Investigate: medium Revenue, high Volatility
    else if (isMedRevenue && isHighVolatility) {
      investigate.push(item)
    }
    // Remove: low Revenue, low Count, high Volatility (or persistently low performance)
    else if ((isLowRevenue && isLowCount && isHighVolatility) || (isLowRevenue && isLowCount && item.Count < 5)) {
      remove.push(item)
    }
    // Default: assign to monitor if doesn't fit other categories
    else {
      monitor.push(item)
    }
  })
  
  // Sort each bucket by revenue descending
  const sortByRevenue = (a: any, b: any) => b.Revenue - a.Revenue
  stars.sort(sortByRevenue)
  monitor.sort(sortByRevenue)
  investigate.sort(sortByRevenue)
  remove.sort(sortByRevenue)
  
  return { stars, monitor, investigate, remove }
}

// Get menu quadrant data (for scatter plot)
export function getMenuQuadrantData(data: any[]): Array<{
  Item: string
  Category: string | null
  x: number // Count (Popularity)
  y: number // Revenue/Count (Avg Price) or Revenue
  Revenue: number
  Count: number
  Volatility: number
  AvgPrice: number
}> {
  if (!data || data.length === 0) return []
  
  const itemKey = findColumn(data, ['item', 'item_name', 'menu_item', 'product'])
  const revenueKey = findColumn(data, ['revenue', 'net_price', 'sales'])
  const countKey = findColumn(data, ['count', 'transactions', 'orders'])
  const volatilityKey = findColumn(data, ['volatility', 'volatility_pct'])
  const categoryKey = findColumn(data, ['category', 'item_category'])
  
  if (!itemKey || !revenueKey || !countKey) return []
  
  return data
    .filter(row => {
      const revenue = typeof row[revenueKey] === 'number' ? row[revenueKey] : 0
      const count = typeof row[countKey] === 'number' ? row[countKey] : 0
      return revenue > 0 && count > 0
    })
    .map(row => {
      const revenue = typeof row[revenueKey] === 'number' ? row[revenueKey] : 0
      const count = typeof row[countKey] === 'number' ? row[countKey] : 0
      const volatility = volatilityKey && typeof row[volatilityKey] === 'number' ? row[volatilityKey] : 0
      const avgPrice = count > 0 ? revenue / count : 0
      
      return {
        Item: row[itemKey],
        Category: categoryKey && row[categoryKey] ? row[categoryKey] : null,
        x: count, // Popularity
        y: avgPrice, // Avg Price (or Revenue if avgPrice not possible)
        Revenue: revenue,
        Count: count,
        Volatility: volatility,
        AvgPrice: avgPrice,
      }
    })
}
