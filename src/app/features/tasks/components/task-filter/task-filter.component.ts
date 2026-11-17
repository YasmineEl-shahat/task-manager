import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { INITIAL_TASK_FILTERS, TaskFilters } from '@tasks/models/task-filter.model';
import { TaskFilterPriority, TaskFilterStatus } from '@tasks/models/task.enums';

/**
 * Presentational (dumb) component for filtering and searching tasks.
 * Emits incremental filter updates or a reset request.
 */
@Component({
  selector: 'app-task-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './task-filter.component.html',
  styleUrl: './task-filter.component.scss',
})
export class TaskFilterComponent {
  readonly filters = input<TaskFilters>(INITIAL_TASK_FILTERS);

  readonly filtersChange = output<Partial<TaskFilters>>();
  readonly resetFilters = output<void>();

  protected readonly TaskFilterStatus = TaskFilterStatus;
  protected readonly TaskFilterPriority = TaskFilterPriority;

  protected readonly isFiltered = computed(() => {
    const f = this.filters();
    return (
      f.status !== TaskFilterStatus.ALL ||
      f.priority !== TaskFilterPriority.ALL ||
      f.assigneeId !== null ||
      f.search.trim().length > 0
    );
  });

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filtersChange.emit({ search: input.value });
  }

  protected clearSearch(): void {
    this.filtersChange.emit({ search: '' });
  }

  protected onStatusChange(status: TaskFilterStatus): void {
    this.filtersChange.emit({ status });
  }

  protected onPriorityChange(priority: TaskFilterPriority): void {
    this.filtersChange.emit({ priority });
  }
}
