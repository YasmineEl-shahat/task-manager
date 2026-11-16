import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { Task } from '@tasks/models/task.model';
import { TaskStatus } from '@tasks/models/task.enums';
import { KanbanColumnComponent } from '../kanban-column/kanban-column.component';
import { SkeletonCardComponent } from '@shared/components';

export type KanbanColumnTab = 'all' | 'todo' | 'in_progress' | 'done';

export interface KanbanColumnConfig {
  readonly id: Exclude<KanbanColumnTab, 'all'>;
  readonly title: string;
  readonly tasks: readonly Task[];
  readonly emptyMessage: string;
  readonly emptyIcon: string;
}

/**
 * Kanban Board Component.
 * Orchestrates 3 Kanban columns (TO DO, IN PROGRESS, DONE)
 * with status tabs filtering and skeleton loading states.
 */
@Component({
  selector: 'app-kanban-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KanbanColumnComponent, SkeletonCardComponent],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent {
  readonly tasks = input<readonly Task[]>([]);
  readonly selectedTab = input<KanbanColumnTab>('all');
  readonly isLoading = input<boolean>(false);

  readonly selectTask = output<string>();
  readonly editTask = output<Task>();
  readonly deleteTask = output<string>();

  readonly todoTasks = computed(() =>
    this.tasks().filter((t) => t.status === TaskStatus.TODO),
  );

  readonly inProgressTasks = computed(() =>
    this.tasks().filter((t) => t.status === TaskStatus.IN_PROGRESS),
  );

  readonly doneTasks = computed(() =>
    this.tasks().filter((t) => t.status === TaskStatus.DONE),
  );

  readonly columns = computed<readonly KanbanColumnConfig[]>(() => [
    {
      id: 'todo',
      title: 'TO DO',
      tasks: this.todoTasks(),
      emptyMessage: 'No tasks to do',
      emptyIcon: 'inbox',
    },
    {
      id: 'in_progress',
      title: 'IN PROGRESS',
      tasks: this.inProgressTasks(),
      emptyMessage: 'No tasks in progress',
      emptyIcon: 'inbox',
    },
    {
      id: 'done',
      title: 'DONE',
      tasks: this.doneTasks(),
      emptyMessage: 'No completed tasks',
      emptyIcon: 'check_circle_outline',
    },
  ]);

  readonly visibleColumns = computed<readonly KanbanColumnConfig[]>(() => {
    const tab = this.selectedTab();
    const cols = this.columns();
    return tab === 'all' ? cols : cols.filter((col) => col.id === tab);
  });
}
