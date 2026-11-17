import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Assignee, Task } from '@tasks/models/task.model';
import { CreateTaskDto } from '@tasks/models/task.dto';
import { TaskStore } from '@tasks/store/task.store';
import { TEAM_MEMBERS } from '@features/team/data/team-members.data';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';

export interface TaskFormData {
  task?: Task;
  assigneeId?: string;
}

export const AVAILABLE_ASSIGNEES: Assignee[] = [...TEAM_MEMBERS];

const DEFAULT_ASSIGNEE: Assignee = AVAILABLE_ASSIGNEES[0]!;

@Component({
  selector: 'app-task-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss',
})
export class TaskFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(TaskStore);
  private readonly dialogRef = inject(MatDialogRef<TaskFormComponent>, {
    optional: true,
  });
  readonly data: TaskFormData = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly TaskStatus = TaskStatus;
  readonly TaskPriority = TaskPriority;
  readonly assignees = AVAILABLE_ASSIGNEES;

  readonly isEditMode = !!this.data.task;
  readonly isSubmitting = signal(false);

  // Default due date to tomorrow formatted as YYYY-MM-DD
  private readonly defaultDueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  readonly form = this.fb.group({
    title: [
      this.data.task?.title ?? '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
    ],
    description: [this.data.task?.description ?? '', [Validators.maxLength(500)]],
    status: [this.data.task?.status ?? TaskStatus.TODO, [Validators.required]],
    priority: [this.data.task?.priority ?? TaskPriority.MEDIUM, [Validators.required]],
    dueDate: [
      this.data.task?.dueDate ? this.data.task.dueDate.split('T')[0] : this.defaultDueDate,
      [Validators.required],
    ],
    assigneeId: [
      this.data.task?.assignee?.id ?? this.data.assigneeId ?? DEFAULT_ASSIGNEE.id,
      [Validators.required],
    ],
    tags: [this.data.task?.tags?.join(', ') ?? ''],
  });

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const val = this.form.getRawValue();
    const assignee = this.assignees.find((a) => a.id === val.assigneeId) ?? DEFAULT_ASSIGNEE;

    const tags = val.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const dto: CreateTaskDto = {
      title: val.title.trim(),
      description: val.description.trim(),
      status: val.status,
      priority: val.priority,
      dueDate: new Date(val.dueDate || Date.now()).toISOString(),
      assignee,
      tags,
    };

    if (this.isEditMode && this.data.task) {
      this.store.updateTask(this.data.task.id, dto);
    } else {
      this.store.createTask(dto);
    }

    this.dialogRef?.close(dto);
  }

  onCancel(): void {
    this.dialogRef?.close();
  }
}
