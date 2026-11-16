import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskCardComponent } from './task-card.component';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-101',
    title: 'Implement unit tests',
    description: 'Ensure 80% coverage on all services and components',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: '2099-01-01',
    assignee: {
      id: 'u-1',
      name: 'Yasmine',
      avatar: 'YA',
      email: 'yasmine@example.com',
    },
    tags: ['testing', 'frontend'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskCardComponent', () => {
  let fixture: ComponentFixture<TaskCardComponent>;
  let component: TaskCardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskCardComponent],
    });
    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('task', makeTask());
    fixture.detectChanges();
  });

  it('renders task title and assignee', () => {
    const title = fixture.debugElement.query(By.css('.task-title'));
    const assignee = fixture.debugElement.query(By.css('.assignee-name'));

    expect(title.nativeElement.textContent).toContain('Implement unit tests');
    expect(assignee.nativeElement.textContent).toContain('Yasmine');
  });

  it('emits selectTask when card is clicked', () => {
    const spy = vi.fn();
    component.selectTask.subscribe(spy);

    const card = fixture.debugElement.query(By.css('.task-card'));
    card.nativeElement.click();

    expect(spy).toHaveBeenCalledWith('task-101');
  });

  it('emits editTask when edit button is clicked without bubbling', () => {
    const editSpy = vi.fn();
    const selectSpy = vi.fn();
    component.editTask.subscribe(editSpy);
    component.selectTask.subscribe(selectSpy);

    const editBtn = fixture.debugElement.query(
      By.css('[aria-label="Edit task: Implement unit tests"]'),
    );
    editBtn.nativeElement.click();

    expect(editSpy).toHaveBeenCalledOnce();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('emits deleteTask when delete button is clicked without bubbling', () => {
    const deleteSpy = vi.fn();
    const selectSpy = vi.fn();
    component.deleteTask.subscribe(deleteSpy);
    component.selectTask.subscribe(selectSpy);

    const deleteBtn = fixture.debugElement.query(
      By.css('[aria-label="Delete task: Implement unit tests"]'),
    );
    deleteBtn.nativeElement.click();

    expect(deleteSpy).toHaveBeenCalledWith('task-101');
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('adds overdue class when task is overdue', () => {
    fixture.componentRef.setInput(
      'task',
      makeTask({ dueDate: '2000-01-01', status: TaskStatus.TODO }),
    );
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.css('.task-card.overdue'));
    expect(card).toBeTruthy();
    const overdueMeta = fixture.debugElement.query(By.css('.due-row'));
    expect(overdueMeta.nativeElement.textContent).toContain('Overdue by');
  });

  it('renders priority pill and tags correctly', () => {
    fixture.componentRef.setInput(
      'task',
      makeTask({
        priority: TaskPriority.MEDIUM,
        tags: ['Design', 'UX'],
        assignee: { id: 'u2', name: 'Sarah Smith', avatar: '', email: 's@test.com' },
      }),
    );
    fixture.detectChanges();

    const priorityBadge = fixture.debugElement.query(By.css('.priority-badge'));
    expect(priorityBadge.nativeElement.textContent).toContain('MEDIUM');

    const tags = fixture.debugElement.query(By.css('.tag-row'));
    expect(tags.nativeElement.textContent).toContain('Design, UX');

    const avatar = fixture.debugElement.query(By.css('.avatar-circle'));
    expect(avatar.nativeElement.textContent.trim()).toBe('SS');

    const handle = fixture.debugElement.query(By.css('.assignee-name'));
    expect(handle.nativeElement.textContent.trim()).toBe('@Sarah');
  });

  it('handles due today and low priority tasks', () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    fixture.componentRef.setInput(
      'task',
      makeTask({
        dueDate: todayStr,
        priority: TaskPriority.LOW,
      }),
    );
    fixture.detectChanges();

    const dueRow = fixture.debugElement.query(By.css('.due-row'));
    expect(dueRow.nativeElement.textContent).toContain('Due today');

    const priorityBadge = fixture.debugElement.query(By.css('.priority-badge'));
    expect(priorityBadge.nativeElement.textContent).toContain('LOW');
  });
});
