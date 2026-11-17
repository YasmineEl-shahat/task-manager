import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskStore } from '@tasks/store/task.store';
import { AVAILABLE_ASSIGNEES, TaskFormComponent, TaskFormData } from './task-form.component';

describe('TaskFormComponent', () => {
  let fixture: ComponentFixture<TaskFormComponent>;
  let component: TaskFormComponent;

  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockStore = {
    createTask: vi.fn(),
    updateTask: vi.fn(),
  };

  const mockTask: Task = {
    id: 'task-101',
    title: 'Existing Task Title',
    description: 'Existing description',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    dueDate: '2026-12-01T00:00:00.000Z',
    assignee: AVAILABLE_ASSIGNEES[1] ?? {
      id: 'u2',
      name: 'John',
      avatar: 'JD',
      email: 'j@test.com',
    },
    tags: ['Frontend', 'Angular'],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  async function createComponent(dialogData: TaskFormData = {}) {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: TaskStore, useValue: mockStore },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    beforeEach(async () => {
      await createComponent({});
    });

    it('creates form with default values and isEditMode = false', () => {
      expect(component.isEditMode).toBe(false);
      expect(component.form.controls.title.value).toBe('');
      expect(component.form.controls.status.value).toBe(TaskStatus.TODO);
      expect(component.form.controls.priority.value).toBe(TaskPriority.MEDIUM);
      expect(component.form.valid).toBe(false);
    });

    it('validates title as required with minlength 3', () => {
      const titleCtrl = component.form.controls.title;
      expect(titleCtrl.valid).toBe(false);

      titleCtrl.setValue('ab');
      expect(titleCtrl.hasError('minlength')).toBe(true);

      titleCtrl.setValue('Valid title');
      expect(titleCtrl.valid).toBe(true);
    });

    it('submits create task DTO and closes dialog', () => {
      component.form.patchValue({
        title: 'New Feature Implementation',
        description: 'Detailed description here',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: '2026-12-31',
        assigneeId: AVAILABLE_ASSIGNEES[0]?.id ?? 'user-1',
        tags: 'Tech, Angular',
      });

      expect(component.form.valid).toBe(true);

      component.onSubmit();

      expect(mockStore.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Feature Implementation',
          description: 'Detailed description here',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          tags: ['Tech', 'Angular'],
        }),
      );
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('does not submit if form is invalid', () => {
      component.form.patchValue({ title: '' });
      component.onSubmit();

      expect(mockStore.createTask).not.toHaveBeenCalled();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('closes dialog on onCancel()', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('Assigning a task to a team member', () => {
    beforeEach(async () => {
      await createComponent({ assigneeId: AVAILABLE_ASSIGNEES[1]!.id });
    });

    it('uses the selected team member as the new task assignee', () => {
      expect(component.form.controls.assigneeId.value).toBe(AVAILABLE_ASSIGNEES[1]!.id);
    });
  });

  describe('Edit Mode', () => {
    beforeEach(async () => {
      await createComponent({ task: mockTask });
    });

    it('populates form with existing task data and isEditMode = true', () => {
      expect(component.isEditMode).toBe(true);
      expect(component.form.controls.title.value).toBe('Existing Task Title');
      expect(component.form.controls.status.value).toBe(TaskStatus.IN_PROGRESS);
      expect(component.form.controls.priority.value).toBe(TaskPriority.HIGH);
      expect(component.form.controls.tags.value).toBe('Frontend, Angular');
      expect(component.form.valid).toBe(true);
    });

    it('submits update task DTO with task id and closes dialog', () => {
      component.form.patchValue({
        title: 'Updated Task Title',
      });

      component.onSubmit();

      expect(mockStore.updateTask).toHaveBeenCalledWith(
        'task-101',
        expect.objectContaining({
          title: 'Updated Task Title',
        }),
      );
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });
});
