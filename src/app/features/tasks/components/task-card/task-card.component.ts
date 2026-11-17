import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Task } from '@tasks/models/task.model';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { I18nService } from '@app/core/i18n/i18n.service';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';

/**
 * Presentational (dumb) component representing a single task card.
 * Emits events for selection, editing, and deletion.
 */
@Component({
  selector: 'app-task-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
})
export class TaskCardComponent {
  private readonly i18n = inject(I18nService);
  readonly task = input.required<Task>();
  readonly position = input(0);
  readonly taskCount = input(1);

  readonly selectTask = output<string>();
  readonly editTask = output<Task>();
  readonly deleteTask = output<string>();
  readonly statusChange = output<TaskStatus>();
  readonly reorder = output<'up' | 'down'>();

  protected readonly statusOptions = [
    { value: TaskStatus.TODO, label: 'To Do' },
    { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { value: TaskStatus.DONE, label: 'Done' },
  ];

  protected readonly isOverdue = computed(() => {
    const t = this.task();
    if (t.isOverdue !== undefined) {
      return t.isOverdue;
    }
    if (!t.dueDate || t.status === TaskStatus.DONE) {
      return false;
    }
    const due = new Date(`${t.dueDate}T00:00:00`);
    return !Number.isNaN(due.getTime()) && due < new Date();
  });

  protected readonly priorityLabel = computed(() => {
    const p = this.task().priority;
    const labels: Record<TaskPriority, string> = {
      [TaskPriority.HIGH]: this.i18n.translate('HIGH'),
      [TaskPriority.MEDIUM]: this.i18n.translate('MEDIUM'),
      [TaskPriority.LOW]: this.i18n.translate('LOW'),
    };
    return labels[p] ?? String(p).toUpperCase();
  });

  protected readonly statusLabel = computed(() => {
    const s = this.task().status;
    const labels: Record<TaskStatus, string> = {
      [TaskStatus.TODO]: this.i18n.translate('To Do'),
      [TaskStatus.IN_PROGRESS]: this.i18n.translate('In Progress'),
      [TaskStatus.DONE]: this.i18n.translate('Done'),
    };
    return labels[s] ?? s;
  });

  protected readonly assigneeInitials = computed(() => {
    const a = this.task().assignee;
    if (a?.avatar) return a.avatar;
    if (!a?.name) return '??';
    const parts = a.name.trim().split(/\s+/);
    const first = parts[0];
    const second = parts[1];
    if (first && second && first.length > 0 && second.length > 0) {
      return (first[0]! + second[0]!).toUpperCase();
    }
    return a.name.slice(0, 2).toUpperCase();
  });

  protected readonly assigneeHandle = computed(() => {
    const name = this.task().assignee?.name || '';
    if (!name) return '';
    const firstName = name.split(' ')[0];
    return `@${firstName}`;
  });

  protected readonly tagText = computed(() => {
    const tags = this.task().tags;
    return tags && tags.length > 0 ? tags.join(', ') : '';
  });

  protected readonly dueStatusInfo = computed(() => {
    const t = this.task();
    if (!t.dueDate) return null;

    const due = new Date(`${t.dueDate}T00:00:00`);
    if (Number.isNaN(due.getTime())) {
      return {
        isOverdue: false,
        text: t.dueDate,
        icon: 'event',
      };
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    if (t.isOverdue || diffDays < 0) {
      const days = Math.max(1, Math.abs(diffDays));
      return {
        isOverdue: true,
        text: this.i18n.translate(`Overdue by {count} ${days === 1 ? 'day' : 'days'}`, {
          count: days,
        }),
        icon: 'warning',
      };
    }

    if (diffDays === 0) {
      return {
        isOverdue: false,
        text: this.i18n.translate('Due today'),
        icon: 'event',
      };
    }

    return {
      isOverdue: false,
      text: this.i18n.translate(`Due in {count} ${diffDays === 1 ? 'day' : 'days'}`, {
        count: diffDays,
      }),
      icon: 'event',
    };
  });

  protected onCardClick(): void {
    this.selectTask.emit(this.task().id);
  }

  protected onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.editTask.emit(this.task());
  }

  protected onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.deleteTask.emit(this.task().id);
  }

  protected onStatusChange(status: TaskStatus): void {
    this.statusChange.emit(status);
  }
}
