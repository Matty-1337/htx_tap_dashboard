/**
 * Best Regards brand tour steps - Sleek, modern, data-driven
 */
import { TourSection, TourStep } from './types'

export function stepsFor(section: TourSection): TourStep[] {
  switch (section) {
    case 'overview':
      return [
        {
          element: '[data-tour="overview.kpis"]',
          popover: {
            title: 'Core Metrics',
            description: 'Essential performance indicators at a glance. Revenue, transactions, and leakage metrics update automatically.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="overview.revenue_hour"]',
          popover: {
            title: 'Hourly Revenue Patterns',
            description: 'Identify peak service periods and optimize resource allocation. Data-driven scheduling starts here.',
            side: 'left',
            align: 'center',
          },
        },
        {
          element: '[data-tour="overview.revenue_day"]',
          popover: {
            title: 'Weekly Revenue Distribution',
            description: 'Track day-of-week performance trends. Use this data to inform strategic planning and promotions.',
            side: 'left',
            align: 'center',
          },
        },
        {
          element: '[data-tour="overview.top_actions"]',
          popover: {
            title: 'Priority Actions',
            description: 'High-impact actions derived from your latest analysis. Focus on these for maximum operational efficiency.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="overview.filters"]',
          popover: {
            title: 'Data Filters',
            description: 'Modify analysis parameters: date range, server, category, or status. All sections update dynamically.',
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
            title: 'Leakage Composition',
            description: 'Breakdown of void, discount, and removal components. This visualization shows the structure of total leakage.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="waste.by_reason"]',
          popover: {
            title: 'Leakage Drivers',
            description: 'Primary reasons contributing to waste. Click any reason to filter the detail view and focus analysis.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="waste.by_category"]',
          popover: {
            title: 'Category-Level Analysis',
            description: 'Waste metrics by category with trend indicators. Monitor these to identify emerging patterns early.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="waste.detail_table"]',
          popover: {
            title: 'Transaction-Level Data',
            description: 'Complete waste analysis table. Click any row to apply filters across all dashboard sections.',
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
            title: 'Performance Rankings',
            description: 'Team members ranked by key metrics. Sort by revenue, transactions, or void rate to identify coaching targets.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="team.snapshot"]',
          popover: {
            title: 'Individual Metrics',
            description: 'Comprehensive performance snapshot for the selected team member. All key metrics in one view.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="team.coaching_insights"]',
          popover: {
            title: 'Data-Driven Insights',
            description: 'Actionable recommendations based on performance analysis. Use these insights to guide development conversations.',
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
            title: 'High Volatility Items',
            description: 'Items with significant performance variance require attention. These are candidates for standardization or pricing review.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="menu.buckets"]',
          popover: {
            title: 'Menu Segmentation',
            description: 'Items classified by performance profile: Stars (promote), Monitor (observe), Investigate (analyze), Remove (consider elimination).',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="menu.quadrant"]',
          popover: {
            title: 'Menu Engineering Matrix',
            description: 'Two-dimensional analysis: popularity vs. average price. Top-right quadrant items are strategic winners.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="menu.table"]',
          popover: {
            title: 'Comprehensive Menu Data',
            description: 'Full menu performance dataset. Click any item to filter other sections and conduct cross-sectional analysis.',
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
            description: 'Prioritized actions generated from analysis. High-priority items offer the greatest potential impact.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.assignee_filter"]',
          popover: {
            title: 'Assignee Filter',
            description: 'Filter actions by team member. Enables efficient delegation tracking and accountability management.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.action_status"]',
          popover: {
            title: 'Status Management',
            description: 'Mark actions complete to track progress. Completed items are archived in the Completed tab.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.action_assignee"]',
          popover: {
            title: 'Action Delegation',
            description: 'Assign actions to team members. All changes persist automatically and sync across sessions.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.copy_export"]',
          popover: {
            title: 'Export Functionality',
            description: 'Copy all open actions in markdown format. Suitable for documentation, email, or external task management.',
            side: 'left',
            align: 'start',
          },
        },
      ]

    default:
      return []
  }
}
