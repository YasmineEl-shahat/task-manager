import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import(
        '@features/dashboard/pages/dashboard-page/dashboard-page.component'
      ).then((m) => m.DashboardPageComponent),
    title: 'Dashboard | Task Manager',
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import(
        '@features/dashboard/pages/dashboard-page/dashboard-page.component'
      ).then((m) => m.DashboardPageComponent),
    title: 'Tasks | Task Manager',
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import(
        '@features/dashboard/pages/dashboard-page/dashboard-page.component'
      ).then((m) => m.DashboardPageComponent),
    title: 'Calendar | Task Manager',
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import(
        '@features/dashboard/pages/dashboard-page/dashboard-page.component'
      ).then((m) => m.DashboardPageComponent),
    title: 'Analytics | Task Manager',
  },
  {
    path: 'team',
    loadComponent: () =>
      import(
        '@features/dashboard/pages/dashboard-page/dashboard-page.component'
      ).then((m) => m.DashboardPageComponent),
    title: 'Team | Task Manager',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import(
        '@features/dashboard/pages/dashboard-page/dashboard-page.component'
      ).then((m) => m.DashboardPageComponent),
    title: 'Settings | Task Manager',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
