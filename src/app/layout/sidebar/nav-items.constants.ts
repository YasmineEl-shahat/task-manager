import { NavItem } from './nav-item.type';

/**
 * Default sidebar navigation items matching Figma design.
 */
export const DEFAULT_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', exact: false },
  { label: 'Tasks', path: '/tasks', icon: 'check_circle', iconClass: 'check-icon' },
  { label: 'Calendar', path: '/calendar', icon: 'calendar_today', iconClass: 'calendar-icon' },
  { label: 'Analytics', path: '/analytics', icon: 'bar_chart', iconClass: 'analytics-icon' },
  { label: 'Team', path: '/team', icon: 'group', iconClass: 'team-icon' },
  { label: 'Settings', path: '/settings', icon: 'settings', iconClass: 'settings-icon' },
] as const;

export const NAV_ITEMS = DEFAULT_NAV_ITEMS;
