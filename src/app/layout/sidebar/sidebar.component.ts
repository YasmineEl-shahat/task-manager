import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { NavItem } from './nav-item.type';
import { DEFAULT_NAV_ITEMS } from './nav-items.constants';

export type { NavItem };
export { DEFAULT_NAV_ITEMS };

/**
 * Sidebar Navigation Component.
 * Implements dynamic navigation links with lazy routes and task creation shortcut.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly navItems = input<readonly NavItem[]>(DEFAULT_NAV_ITEMS);
  readonly createNewTask = output<void>();
}
