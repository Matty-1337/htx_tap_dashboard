/**
 * Action Engine - Generates actionable insights from analysis payload
 */

export type Priority = 'high' | 'medium' | 'low'

export interface ActionItem {
  id: string
  priority: Priority
  title: string
  rationale: string
  steps: string[]
  estimatedImpactUsd?: number
  source: {
    report: string
    keys: Record<string, string | number>
  }
}

interface Filters {
  selectedServer?: string
  selectedStatus?: string
  selectedCategory?: string
}

interface AnalysisPayload {
  kpis?: Record<string, number>
  tables?: {
    waste_efficiency?: { data: any[]; columns?: string[] }
    employee_performance?: { data: any[]; columns?: string[] }
    menu_volatility?: { data: any[]; columns?: string[] }
    [key: string]: any
  }
  [key: string]: any
}

// Helper: Find column by case-insensitive match
function findColumn(data: any[], patterns: string[]): string | null {
  if (!data || data.length === 0) return null
  const keys = Object.keys(data[0])
  for (const pattern of patterns) {
    const found = keys.find((key) => key.toLowerCase().includes(pattern.toLowerCase()))
    if (found) return found
  }
  return null
}

// Helper: Get numeric value safely
function getNumericValue(row: any, key: string | null): number {
  if (!key || !row[key]) return 0
  const val = row[key]
  return typeof val === 'number' ? val : parseFloat(String(val)) || 0
}

// Helper: Get string value safely
function getStringValue(row: any, key: string | null): string {
  if (!key || !row[key]) return ''
  return String(row[key])
}

export function generateActions(payload: AnalysisPayload, filters: Filters = {}): ActionItem[] {
  const actions: ActionItem[] = []
  const actionId = () => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // 1. Waste / Team Performance Actions
  const employeeData = payload.tables?.employee_performance?.data || []
  const wasteData = payload.tables?.waste_efficiency?.data || []

  if (employeeData.length > 0 || wasteData.length > 0) {
    const dataSource = employeeData.length > 0 ? employeeData : wasteData
    const statusKey = findColumn(dataSource, ['status'])
    const serverKey = findColumn(dataSource, ['server', 'employee', 'name'])
    const wasteRateKey = findColumn(dataSource, ['waste_rate_pct', 'waste_rate', 'waste_pct'])
    const totalWasteKey = findColumn(dataSource, ['total_waste', 'waste', 'waste_value'])

    // Filter data if server filter is active
    let candidates = dataSource
    if (filters.selectedServer && serverKey) {
      candidates = dataSource.filter((row) => getStringValue(row, serverKey) === filters.selectedServer)
    }

    // Find critical candidates
    const criticalCandidates = candidates.filter((row) => {
      const status = statusKey ? getStringValue(row, statusKey).toLowerCase() : ''
      const wasteRate = getNumericValue(row, wasteRateKey)
      const totalWaste = getNumericValue(row, totalWasteKey)

      return (
        status === 'critical' ||
        wasteRate >= 20 ||
        (totalWaste > 0 && candidates.length > 0 && totalWaste >= Math.max(...candidates.map((r) => getNumericValue(r, totalWasteKey))) * 0.8)
      )
    })

    // Sort by total waste descending
    criticalCandidates.sort((a, b) => getNumericValue(b, totalWasteKey) - getNumericValue(a, totalWasteKey))

    // Generate action for top candidates (up to 3)
    criticalCandidates.slice(0, 3).forEach((row) => {
      const serverName = serverKey ? getStringValue(row, serverKey) : 'Team Member'
      const totalWaste = getNumericValue(row, totalWasteKey)
      const wasteRate = getNumericValue(row, wasteRateKey)

      actions.push({
        id: actionId(),
        priority: 'high',
        title: `Coaching focus: reduce waste rate for ${serverName}`,
        rationale: `This pattern suggests a coaching opportunity to tighten comps/removes/void flow while keeping service smooth. Current waste rate: ${wasteRate.toFixed(1)}%.`,
        steps: [
          'Review top void + removed reasons for the week (10–15 min).',
          'Shadow one peak shift to observe order flow.',
          'Confirm recipe/portioning and comps policy reminders.',
        ],
        estimatedImpactUsd: totalWaste > 0 ? totalWaste * 0.3 : undefined,
        source: {
          report: employeeData.length > 0 ? 'employee_performance' : 'waste_efficiency',
          keys: serverKey ? { [serverKey]: getStringValue(row, serverKey) } : {},
        },
      })
    })
  }

  // 2. Menu Volatility Actions
  const menuData = payload.tables?.menu_volatility?.data || []
  if (menuData.length > 0) {
    const actionKey = findColumn(menuData, ['action', 'recommendation'])
    const volatilityKey = findColumn(menuData, ['volatility_pct', 'volatility', 'volatility_rate'])
    const itemKey = findColumn(menuData, ['item', 'name', 'menu_item', 'product'])
    const totalWasteKey = findColumn(menuData, ['total_waste', 'waste', 'waste_value'])

    const volatileItems = menuData.filter((row) => {
      const action = actionKey ? getStringValue(row, actionKey).toUpperCase() : ''
      const volatility = getNumericValue(row, volatilityKey)
      const totalWaste = getNumericValue(row, totalWasteKey)

      return action === 'REMOVE' || volatility >= 100 || totalWaste > 0
    })

    volatileItems.slice(0, 2).forEach((row) => {
      const itemName = itemKey ? getStringValue(row, itemKey) : 'Menu Item'
      const volatility = getNumericValue(row, volatilityKey)

      actions.push({
        id: actionId(),
        priority: 'high',
        title: `Menu opportunity: stabilize ${itemName}`,
        rationale: `This item shows high volatility (${volatility.toFixed(1)}%), which suggests a coaching opportunity to improve consistency and reduce waste.`,
        steps: [
          'Confirm recipe cost and portion control standards.',
          'Check portion control during peak shifts.',
          'Consider reprice/rename if needed for clarity.',
          'Retrain top sellers on proper preparation.',
        ],
        source: {
          report: 'menu_volatility',
          keys: itemKey ? { [itemKey]: getStringValue(row, itemKey) } : {},
        },
      })
    })
  }

  // 3. KPI-driven Upsell Opportunities
  const kpis = payload.kpis || {}
  const foodAttachmentRate = kpis.food_attachment_rate || kpis.food_attachment || 0
  const bottleConversionPct = kpis.bottle_conversion_pct || kpis.bottle_conversion || 0

  if (foodAttachmentRate < 10) {
    actions.push({
      id: actionId(),
      priority: 'medium',
      title: 'Boost food attachment rate',
      rationale: `Current food attachment rate is ${foodAttachmentRate.toFixed(1)}%, which suggests an opportunity to increase add-on sales.`,
      steps: [
        'Create a simple upsell script for servers (e.g., "Would you like to add fries or a side salad?").',
        'Run a weekly contest for highest attachment rate with small prizes.',
        'Give server shoutouts in pre-shift for top performers.',
        'Track attachment rate weekly and share results.',
      ],
      source: {
        report: 'kpis',
        keys: { food_attachment_rate: foodAttachmentRate },
      },
    })
  }

  if (bottleConversionPct < 5) {
    actions.push({
      id: actionId(),
      priority: 'medium',
      title: 'Improve bottle conversion percentage',
      rationale: `Current bottle conversion is ${bottleConversionPct.toFixed(1)}%, which suggests an opportunity to increase premium wine sales.`,
      steps: [
        'Train servers on wine pairing recommendations.',
        'Create a "bottle of the week" promotion with server incentives.',
        'Highlight bottle options on the menu or table cards.',
        'Track bottle sales weekly and recognize top performers.',
      ],
      source: {
        report: 'kpis',
        keys: { bottle_conversion_pct: bottleConversionPct },
      },
    })
  }

  // 4. Additional medium-priority actions based on KPIs
  const missedRevenue = kpis.missed_revenue || kpis.missed_revenue_usd || 0
  if (missedRevenue > 1000 && actions.filter((a) => a.priority === 'medium').length < 3) {
    actions.push({
      id: actionId(),
      priority: 'medium',
      title: 'Address missed revenue opportunities',
      rationale: `Analysis shows ${missedRevenue > 10000 ? 'significant' : 'some'} missed revenue patterns that warrant a quick review.`,
      steps: [
        'Review void and discount patterns for the past week.',
        'Identify common reasons for voids and address root causes.',
        'Ensure comp policy is clear and consistently applied.',
        'Track improvements weekly.',
      ],
      estimatedImpactUsd: missedRevenue * 0.2,
      source: {
        report: 'kpis',
        keys: { missed_revenue: missedRevenue },
      },
    })
  }

  // 5. Low-priority actions (fill remaining slots)
  const avgCheck = kpis.avg_check || kpis.average_check || 0
  if (avgCheck > 0 && actions.filter((a) => a.priority === 'low').length < 2) {
    const industryBenchmark = 45 // Example benchmark
    if (avgCheck < industryBenchmark) {
      actions.push({
        id: actionId(),
        priority: 'low',
        title: 'Explore average check improvement',
        rationale: `Current average check is $${avgCheck.toFixed(2)}, which suggests an opportunity to increase per-guest spending.`,
        steps: [
          'Review menu pricing and positioning.',
          'Train servers on suggestive selling techniques.',
          'Consider adding premium options or bundles.',
          'Track average check trends weekly.',
        ],
        source: {
          report: 'kpis',
          keys: { avg_check: avgCheck },
        },
      })
    }
  }

  // Sort and cap actions: 3 high, 3 medium, 2 low
  actions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return (b.estimatedImpactUsd || 0) - (a.estimatedImpactUsd || 0)
  })

  const highPriority = actions.filter((a) => a.priority === 'high').slice(0, 3)
  const mediumPriority = actions.filter((a) => a.priority === 'medium').slice(0, 3)
  const lowPriority = actions.filter((a) => a.priority === 'low').slice(0, 2)

  return [...highPriority, ...mediumPriority, ...lowPriority]
}
