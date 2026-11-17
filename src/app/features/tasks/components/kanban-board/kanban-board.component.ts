import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Task } from '@tasks/models/task.model';
import { TaskStatus } from '@tasks/models/task.enums';
import {
  CdkDragDrop,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { KanbanColumnComponent } from '../kanban-column/kanban-column.component';
import { SkeletonCardComponent } from '@shared/components';

export type KanbanColumnTab = 'all' | 'todo' | 'in_progress' | 'done';

export interface KanbanColumnConfig {
  readonly id: Exclude<KanbanColumnTab, 'all'>;
  readonly title: string;
  readonly tasks: Task[];
  readonly emptyMessage: string;
  readonly emptyIcon: string;
  readonly status: TaskStatus;
}

export interface KanbanTaskDrop {
  readonly taskId: string;
  readonly status: TaskStatus;
  readonly statusChanged: boolean;
  readonly orderedTaskIds: readonly string[];
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
  imports: [CdkDropListGroup, KanbanColumnComponent, SkeletonCardComponent],
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
  readonly taskDrop = output<KanbanTaskDrop>();

  private readonly orderedTaskIds = signal<readonly string[]>([]);

  readonly todoTasks = computed(() =>
    this.sortTasks(this.tasks().filter((t) => t.status === TaskStatus.TODO)),
  );

  readonly inProgressTasks = computed(() =>
    this.sortTasks(this.tasks().filter((t) => t.status === TaskStatus.IN_PROGRESS)),
  );

  readonly doneTasks = computed(() =>
    this.sortTasks(this.tasks().filter((t) => t.status === TaskStatus.DONE)),
  );

  readonly columns = computed<readonly KanbanColumnConfig[]>(() => [
    {
      id: 'todo',
      title: 'TO DO',
      tasks: this.todoTasks(),
      status: TaskStatus.TODO,
      emptyMessage: 'No tasks to do',
      emptyIcon: 'inbox',
    },
    {
      id: 'in_progress',
      title: 'IN PROGRESS',
      tasks: this.inProgressTasks(),
      status: TaskStatus.IN_PROGRESS,
      emptyMessage: 'No tasks in progress',
      emptyIcon: 'inbox',
    },
    {
      id: 'done',
      title: 'DONE',
      tasks: this.doneTasks(),
      status: TaskStatus.DONE,
      emptyMessage: 'No completed tasks',
      emptyIcon: 'check_circle_outline',
    },
  ]);

  readonly visibleColumns = computed<readonly KanbanColumnConfig[]>(() => {
    const tab = this.selectedTab();
    const cols = this.columns();
    return tab === 'all' ? cols : cols.filter((col) => col.id === tab);
  });

  onTaskDrop(status: TaskStatus, event: CdkDragDrop<Task[]>): void {
    const sourceTasks = [...event.previousContainer.data];
    const targetTasks =
      event.previousContainer === event.container ? sourceTasks : [...event.container.data];

    if (event.previousContainer === event.container) {
      moveItemInArray(sourceTasks, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(sourceTasks, targetTasks, event.previousIndex, event.currentIndex);
    }

    const orderedTaskIds = [
      ...sourceTasks.map((task) => task.id),
      ...(event.previousContainer === event.container ? [] : targetTasks.map((task) => task.id)),
    ];
    this.orderedTaskIds.set(orderedTaskIds);

    const task = event.item.data;
    this.taskDrop.emit({
      taskId: task.id,
      status,
      statusChanged: event.previousContainer !== event.container,
      orderedTaskIds,
    });
  }

  onTaskStatusChange(change: { taskId: string; status: TaskStatus }): void {
    this.taskDrop.emit({
      ...change,
      statusChanged: true,
      orderedTaskIds: this.orderedTaskIds(),
    });
  }

  onTaskReorder(status: TaskStatus, change: { taskId: string; direction: 'up' | 'down' }): void {
    const tasks = this.sortTasks(this.tasks().filter((task) => task.status === status));
    const currentIndex = tasks.findIndex((task) => task.id === change.taskId);
    const nextIndex = currentIndex + (change.direction === 'up' ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= tasks.length) return;

    moveItemInArray(tasks, currentIndex, nextIndex);
    const orderedTaskIds = tasks.map((task) => task.id);
    this.orderedTaskIds.set(orderedTaskIds);
    this.taskDrop.emit({
      taskId: change.taskId,
      status,
      statusChanged: false,
      orderedTaskIds,
    });
  }

  private sortTasks(tasks: readonly Task[]): Task[] {
    const order = new Map(this.orderedTaskIds().map((id, index) => [id, index]));
    return [...tasks].sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }
}
