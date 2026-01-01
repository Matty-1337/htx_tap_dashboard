/**
 * Melrose brand tour steps - Polished, operator-focused, calm authority
 */
import { TourSection, TourStep } from './types'

export function stepsFor(section: TourSection): TourStep[] {
  switch (section) {
    case 'overview':
      return [
        {
          element: '[data-tour="overview.kpis"]',
          popover: {
            title: 'Key Performance Indicators',
            description: 'Monitor your core metrics at a glance. Revenue, transactions, and leakage rates update in real time.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="overview.revenue_hour"]',
          popover: {
            title: 'Revenue by Hour',
            description: 'Identify peak service windows and optimize staffing. Patterns here inform scheduling decisions.',
            side: 'left',
            align: 'center',
          },
        },
        {
          element: '[data-tour="overview.revenue_day"]',
          popover: {
            title: 'Revenue by Day',
            description: 'Track weekly performance trends. Use this to plan promotions and adjust operations.',
            side: 'left',
            align: 'center',
          },
        },
        {
          element: '[data-tour="overview.top_actions"]',
          popover: {
            title: 'Top Actions This Week',
            description: 'Priority actions based on your latest analysis. Focus here first for maximum impact.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="overview.filters"]',
          popover: {
            title: 'Date Range & Filters',
            description: 'Adjust the analysis period or drill down by server, category, or status. Changes apply across all sections.',
            side: 'bottom',
            align: 'start',
          },
        },
      ]

    case 'waste':
      return [
        {
          element: '[data-tour="waste.breakdown"]',
          popover: {
            title: 'Leakage Breakdown',
            description: 'See how void, discount, and removal contribute to total leakage. This is your starting point for waste reduction.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="waste.by_reason"]',
          popover: {
            title: 'Leakage by Reason',
            description: 'Top reasons driving waste. Click any bar to filter the detail table and focus your coaching efforts.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="waste.by_category"]',
          popover: {
            title: 'Waste by Category',
            description: 'Identify which categories drive the most leakage. Use trend indicators to spot emerging issues.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="waste.detail_table"]',
          popover: {
            title: 'Detailed Waste Analysis',
            description: 'Full transaction-level view. Click any row to filter other sections and drill into specific patterns.',
            side: 'top',
            align: 'start',
          },
        },
      ]

    case 'team':
      return [
        {
          element: '[data-tour="team.leaderboard"]',
          popover: {
            title: 'Team Leaderboard',
            description: 'Top performers ranked by revenue, transactions, or void rate. Click any server to view their coaching snapshot.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="team.snapshot"]',
          popover: {
            title: 'Coaching Snapshot',
            description: 'Detailed metrics for the selected team member. Revenue, transactions, and void performance at a glance.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="team.coaching_insights"]',
          popover: {
            title: 'Coaching Insights',
            description: 'Action-oriented recommendations based on performance patterns. Use these to guide one-on-one conversations.',
            side: 'right',
            align: 'start',
          },
        },
      ]

    case 'menu':
      return [
        {
          element: '[data-tour="menu.chaos"]',
          popover: {
            title: 'Top Chaos Items',
            description: 'Items with highest volatility need attention. These are prime candidates for recipe standardization or pricing review.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="menu.buckets"]',
          popover: {
            title: 'Menu Classification',
            description: 'Items grouped by performance: Stars (promote), Monitor (watch), Investigate (review), Remove (consider).',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="menu.quadrant"]',
          popover: {
            title: 'Menu Engineering Quadrant',
            description: 'Visualize popularity vs. average price. Items in the top-right (Promote) are your winners. Bottom-left may need removal.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="menu.table"]',
          popover: {
            title: 'Full Menu Analysis',
            description: 'Complete menu performance data. Click any item to filter other sections and analyze its impact.',
            side: 'top',
            align: 'start',
          },
        },
      ]

    case 'rail':
      return [
        {
          element: '[data-tour="rail.container"]',
          popover: {
            title: 'Action Items',
            description: 'Prioritized actions generated from your latest analysis. Focus on high-priority items first.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.assignee_filter"]',
          popover: {
            title: 'Filter by Assignee',
            description: 'View actions by team member. Use this to coordinate delegation and track accountability.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.action_status"]',
          popover: {
            title: 'Mark Actions Complete',
            description: 'Track progress by marking actions done. Completed items move to the Completed tab.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.action_assignee"]',
          popover: {
            title: 'Delegate Actions',
            description: 'Assign actions to team members. Changes sync automatically and persist across sessions.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.copy_export"]',
          popover: {
            title: 'Export Actions',
            description: 'Copy all open actions as markdown for email or documentation. Actions are grouped by assignee.',
            side: 'left',
            align: 'start',
          },
        },
      ]

    default:
      return []
  }
}
