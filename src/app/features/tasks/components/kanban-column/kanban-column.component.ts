import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [MatIconModule, TaskCardComponent],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.scss',
})
export class KanbanColumnComponent {
  readonly title = input.required<string>();
  readonly tasks = input<readonly Task[]>([]);
  readonly emptyMessage = input<string>('No tasks');
  readonly emptyIcon = input<string>('inbox');

  readonly selectTask = output<string>();
  readonly editTask = output<Task>();
  readonly deleteTask = output<string>();

  readonly count = computed(() => this.tasks().length);
}
