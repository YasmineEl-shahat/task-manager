import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { TaskFilterPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskStore } from '@tasks/store/task.store';
import { KanbanBoardComponent } from '@tasks/components/kanban-board/kanban-board.component';
import {
  ConfirmDialogComponent,
  ErrorBannerComponent,
  StatCardComponent,
} from '@shared/components';

export type DashboardTab = 'all' | 'todo' | 'in_progress' | 'done';

export interface DashboardStatCardConfig {
  readonly title: string;
  readonly value: number;
  readonly icon: string;
  readonly iconClass: string;
  readonly trend: string;
  readonly trendType: 'positive' | 'negative' | 'neutral';
  readonly trendIcon?: string;
}

export interface StatusTabOption {
  readonly id: DashboardTab;
  readonly label: string;
}

export interface PriorityFilterOption {
  readonly value: TaskFilterPriority;
  readonly label: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    ErrorBannerComponent,
    StatCardComponent,
    KanbanBoardComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  readonly store = inject(TaskStore);
  private readonly dialog = inject(MatDialog);

  readonly TaskFilterPriority = TaskFilterPriority;

  readonly selectedTab = signal<DashboardTab>('all');

  readonly statusTabs: readonly StatusTabOption[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
  ];

  readonly priorityOptions: readonly PriorityFilterOption[] = [
    { value: TaskFilterPriority.ALL, label: 'All Priorities' },
    { value: TaskFilterPriority.HIGH, label: 'High' },
    { value: TaskFilterPriority.MEDIUM, label: 'Medium' },
    { value: TaskFilterPriority.LOW, label: 'Low' },
  ];

  readonly statCards = computed<readonly DashboardStatCardConfig[]>(() => {
    const stats = this.store.stats();
    return [
      {
        title: 'Total Tasks',
        value: stats.total || 156,
        icon: 'bar_chart',
        iconClass: 'total-icon',
        trend: '+12 this week',
        trendType: 'positive',
        trendIcon: 'trending_up',
      },
      {
        title: 'Completed',
        value: stats.done || 89,
        icon: 'check_circle',
        iconClass: 'completed-icon',
        trend: '+8 today',
        trendType: 'positive',
        trendIcon: 'trending_up',
      },
      {
        title: 'In Progress',
        value: stats.inProgress || 42,
        icon: 'autorenew',
        iconClass: 'inprogress-icon',
        trend: 'Same as yesterday',
        trendType: 'neutral',
      },
      {
        title: 'Overdue',
        value: stats.overdue || 25,
        icon: 'warning',
        iconClass: 'overdue-icon',
        trend: '+3 today',
        trendType: 'negative',
        trendIcon: 'trending_up',
      },
    ];
  });

  readonly todoTasks = computed(() =>
    this.store.filteredTasks().filter((t) => t.status === TaskStatus.TODO),
  );
 
  readonly inProgressTasks = computed(() =>
    this.store.filteredTasks().filter((t) => t.status === TaskStatus.IN_PROGRESS),
  );

  readonly doneTasks = computed(() =>
    this.store.filteredTasks().filter((t) => t.status === TaskStatus.DONE),
  );

  onTabSelect(tab: DashboardTab): void {
    this.selectedTab.set(tab);
  }

  onPriorityChange(priority: TaskFilterPriority): void {
    this.store.setFilters({ priority });
  }

  onTaskSelect(taskId: string): void {
    this.store.selectTask(taskId);
  }

  async openCreateModal(): Promise<void> {
    const { TaskFormComponent } = await import(
      '@tasks/components/task-form/task-form.component'
    );
    this.dialog.open(TaskFormComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {},
    });
  }

  async onTaskEdit(task: Task): Promise<void> {
    const { TaskFormComponent } = await import(
      '@tasks/components/task-form/task-form.component'
    );
    this.dialog.open(TaskFormComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { task },
    });
  }

  onTaskDelete(taskId: string): void {
    const task = this.store.filteredTasks().find((t) => t.id === taskId);
    const title = task?.title ?? 'this task';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Task',
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.deleteTask(taskId);
      }
    });
  }
}
