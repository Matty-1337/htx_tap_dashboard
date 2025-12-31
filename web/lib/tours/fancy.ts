/**
 * Fancy's HTX brand tour steps - Energetic hospitality tone, premium
 */
import { TourSection, TourStep } from './types'

export function stepsFor(section: TourSection): TourStep[] {
  switch (section) {
    case 'overview':
      return [
        {
          element: '[data-tour="overview.kpis"]',
          popover: {
            title: 'Your Key Numbers',
            description: 'Everything you need to know at a glance. Revenue, transactions, and leakage update live as you work.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="overview.revenue_hour"]',
          popover: {
            title: 'Hourly Revenue Trends',
            description: 'Spot your busiest hours and optimize staffing. This chart shows exactly when to schedule your strongest team.',
            side: 'left',
            align: 'center',
          },
        },
        {
          element: '[data-tour="overview.revenue_day"]',
          popover: {
            title: 'Daily Performance',
            description: 'See which days drive the most revenue. Use this to plan specials and promotions that maximize impact.',
            side: 'left',
            align: 'center',
          },
        },
        {
          element: '[data-tour="overview.top_actions"]',
          popover: {
            title: 'This Week\'s Priorities',
            description: 'Top actions to tackle right now. These are ranked by impact—start here for the biggest wins.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="overview.filters"]',
          popover: {
            title: 'Adjust Your View',
            description: 'Change the date range or filter by server, category, or status. Everything updates instantly across the dashboard.',
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
            title: 'Where Leakage Happens',
            description: 'Breakdown of void, discount, and removal totals. This shows you exactly where money is leaving the business.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="waste.by_reason"]',
          popover: {
            title: 'Top Leakage Reasons',
            description: 'The why behind the waste. Click any reason to filter and focus your training on the biggest drivers.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="waste.by_category"]',
          popover: {
            title: 'Category Performance',
            description: 'Which categories are costing you the most. Watch the trend indicators to catch issues early.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="waste.detail_table"]',
          popover: {
            title: 'Drill Into Details',
            description: 'Full waste analysis table. Click any row to filter other sections and see the full picture.',
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
            title: 'Team Rankings',
            description: 'See who\'s performing best. Sort by revenue, transactions, or void rate to find coaching opportunities.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="team.snapshot"]',
          popover: {
            title: 'Individual Performance',
            description: 'Deep dive into any team member\'s metrics. Revenue, transactions, and void data all in one place.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="team.coaching_insights"]',
          popover: {
            title: 'Coaching Recommendations',
            description: 'Actionable insights tailored to each team member. Use these talking points in your next one-on-one.',
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
            title: 'Volatile Items',
            description: 'Items with the highest volatility need your attention. These are prime targets for recipe or pricing fixes.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="menu.buckets"]',
          popover: {
            title: 'Menu Strategy',
            description: 'Items organized by performance: Stars (champions), Monitor (watch closely), Investigate (needs review), Remove (consider cutting).',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="menu.quadrant"]',
          popover: {
            title: 'Menu Engineering',
            description: 'Visual map of popularity vs. price. Top-right quadrant items are your winners—promote them. Bottom-left may need removal.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="menu.table"]',
          popover: {
            title: 'Complete Menu Data',
            description: 'Full menu performance breakdown. Click any item to filter other sections and analyze its full impact.',
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
            title: 'Your Action List',
            description: 'Prioritized actions from your latest analysis. High-priority items deliver the biggest impact—tackle these first.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.assignee_filter"]',
          popover: {
            title: 'Filter by Team Member',
            description: 'View actions by assignee. Perfect for coordinating who handles what and tracking accountability.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.action_status"]',
          popover: {
            title: 'Track Progress',
            description: 'Mark actions complete as you finish them. Completed items move to the Completed tab for your records.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.action_assignee"]',
          popover: {
            title: 'Delegate to Your Team',
            description: 'Assign actions to team members. Changes save automatically and sync across all your devices.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="rail.copy_export"]',
          popover: {
            title: 'Share Actions',
            description: 'Copy all open actions as markdown. Perfect for emailing your team or adding to your notes.',
            side: 'left',
            align: 'start',
          },
        },
      ]

    default:
      return []
  }
}
