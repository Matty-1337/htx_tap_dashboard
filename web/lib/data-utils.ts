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
