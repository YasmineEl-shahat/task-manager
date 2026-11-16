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
}
