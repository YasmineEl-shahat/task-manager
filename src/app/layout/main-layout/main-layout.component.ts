import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { A11yModule } from '@angular/cdk/a11y';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ActivityFeedComponent } from '@tasks/components/activity-feed/activity-feed.component';
import { TaskStore } from '@tasks/store/task.store';

/**
 * Main Application Layout Shell.
 * Holds Sidebar, TopBar, and the routed content via RouterOutlet.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
    ActivityFeedComponent,
    MatDialogModule,
    A11yModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly store = inject(TaskStore);
  private readonly dialog = inject(MatDialog);

  protected onGlobalSearch(search: string): void {
    this.store.setFilters({ search });
  }

  protected async openCreateTaskModal(): Promise<void> {
    const { TaskFormComponent } = await import('@tasks/components/task-form/task-form.component');
    this.dialog.open(TaskFormComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {},
    });
  }

  protected async onActivityTaskClick(taskId: string): Promise<void> {
    const task = this.store.tasks().find((t) => t.id === taskId);
    if (task) {
      const { TaskFormComponent } = await import('@tasks/components/task-form/task-form.component');
      this.dialog.open(TaskFormComponent, {
        width: '560px',
        maxWidth: '95vw',
        data: { task },
      });
    }
  }
}
