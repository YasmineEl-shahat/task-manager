import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ActivityAction, TaskActivity } from '@tasks/models/task-activity.model';
import { TaskStore } from '@tasks/store/task.store';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';
import { I18nService } from '@app/core/i18n/i18n.service';

export type ActivityFilterType = 'all' | ActivityAction;

export interface ActivityFilterOption {
  readonly id: ActivityFilterType;
  readonly label: string;
}

/**
 * Activity Feed Component.
 *
 * Displays recent changes and updates made to tasks (creation, status transitions,
 * assignment, updates, deletions) in an interactive timeline view with real-time updates.
 */
@Component({
  selector: 'app-activity-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, TimeAgoPipe, TranslatePipe],
  templateUrl: './activity-feed.component.html',
  styleUrl: './activity-feed.component.scss',
})
export class ActivityFeedComponent {
  readonly store = inject(TaskStore);
  readonly i18n = inject(I18nService);

  /** Optional external activities list; defaults to `store.activities()` when omitted. */
  readonly activities = input<readonly TaskActivity[] | null>(null);

  /** Title displayed in the feed header. */
  readonly title = input<string>('Recent Activity');

  /** Whether to show the close button in the header (useful for drawer/dialog layouts). */
  readonly showClose = input<boolean>(false);

  /** Whether to show the action filter chips. */
  readonly showFilters = input<boolean>(true);

  /** Emitted when the user closes the feed. */
  readonly closeFeed = output<void>();

  /** Emitted when the user clicks an activity item to view the associated task. */
  readonly taskClick = output<string>();

  /** Currently selected filter. */
  readonly selectedFilter = signal<ActivityFilterType>('all');

  readonly filterOptions: readonly ActivityFilterOption[] = [
    { id: 'all', label: 'All' },
    { id: ActivityAction.CREATED, label: 'Created' },
    { id: ActivityAction.STATUS_CHANGED, label: 'Status' },
    { id: ActivityAction.ASSIGNED, label: 'Assigned' },
    { id: ActivityAction.UPDATED, label: 'Updated' },
    { id: ActivityAction.DELETED, label: 'Deleted' },
  ];

  readonly effectiveActivities = computed<readonly TaskActivity[]>(() => {
    return this.activities() ?? this.store.recentActivities();
  });

  readonly filteredActivities = computed<readonly TaskActivity[]>(() => {
    const list = this.effectiveActivities();
    const filter = this.selectedFilter();

    if (filter === 'all') {
      return list;
    }

    return list.filter((act) => act.action === filter);
  });

  readonly ActivityAction = ActivityAction;

  setFilter(filter: ActivityFilterType): void {
    this.selectedFilter.set(filter);
  }

  getActionIcon(action: ActivityAction): string {
    switch (action) {
      case ActivityAction.CREATED:
        return 'add_circle';
      case ActivityAction.STATUS_CHANGED:
        return 'swap_horiz';
      case ActivityAction.ASSIGNED:
        return 'person_add';
      case ActivityAction.UPDATED:
        return 'edit';
      case ActivityAction.DELETED:
        return 'delete_outline';
      default:
        return 'notifications';
    }
  }

  getActionBadgeClass(action: ActivityAction): string {
    switch (action) {
      case ActivityAction.CREATED:
        return 'badge-created';
      case ActivityAction.STATUS_CHANGED:
        return 'badge-status';
      case ActivityAction.ASSIGNED:
        return 'badge-assigned';
      case ActivityAction.UPDATED:
        return 'badge-updated';
      case ActivityAction.DELETED:
        return 'badge-deleted';
      default:
        return '';
    }
  }

  getActionLabel(action: ActivityAction): string {
    switch (action) {
      case ActivityAction.CREATED:
        return 'Created';
      case ActivityAction.STATUS_CHANGED:
        return 'Status';
      case ActivityAction.ASSIGNED:
        return 'Assigned';
      case ActivityAction.UPDATED:
        return 'Updated';
      case ActivityAction.DELETED:
        return 'Deleted';
      default:
        return action;
    }
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) {
      return (parts[0] ?? '').substring(0, 2).toUpperCase();
    }
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    return (first + last).toUpperCase();
  }

  onActivityClick(activity: TaskActivity): void {
    if (activity.action !== ActivityAction.DELETED) {
      this.taskClick.emit(activity.taskId);
      this.store.selectTask(activity.taskId);
    }
  }

  onClearAll(): void {
    this.store.clearActivities();
  }
}
