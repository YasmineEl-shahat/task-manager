import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';

import { TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';

/**
 * Kanban Column Component.
 * Displays a single kanban column with its title, task count badge,
 * task cards list, and empty state.
 */
@Component({
  selector: 'app-kanban-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, TaskCardComponent, CdkDrag, CdkDragHandle, CdkDropList],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.scss',
})
export class KanbanColumnComponent {
  readonly title = input.required<string>();
  readonly status = input.required<TaskStatus>();
  readonly tasks = input<Task[]>([]);
  readonly emptyMessage = input<string>('No tasks');
  readonly emptyIcon = input<string>('inbox');

  readonly selectTask = output<string>();
  readonly editTask = output<Task>();
  readonly deleteTask = output<string>();
  readonly taskDrop = output<CdkDragDrop<Task[]>>();
  readonly statusChange = output<{ taskId: string; status: TaskStatus }>();
  readonly reorderTask = output<{ taskId: string; direction: 'up' | 'down' }>();

  readonly count = computed(() => this.tasks().length);

  moveTask(taskId: string, direction: 'up' | 'down'): void {
    if (!this.tasks().some((task) => task.id === taskId)) return;
    this.reorderTask.emit({ taskId, direction });
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    this.taskDrop.emit(event);
  }
}
