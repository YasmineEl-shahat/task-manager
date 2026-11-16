import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { Task } from '@tasks/models/task.model';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { KanbanColumnComponent } from './kanban-column.component';

const mockTasks: Task[] = [
  {
    id: 't-col-1',
    title: 'Column Task 1',
    description: 'Column Desc 1',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: '2026-11-20',
    assignee: { id: 'u1', name: 'Sarah Smith', avatar: 'SS', email: 's@test.com' },
    tags: ['Frontend'],
    createdAt: '2026-11-01',
    updatedAt: '2026-11-02',
  },
  {
    id: 't-col-2',
    title: 'Column Task 2',
    description: 'Column Desc 2',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: '2026-11-25',
    assignee: { id: 'u2', name: 'John Doe', avatar: 'JD', email: 'j@test.com' },
    tags: ['Design'],
    createdAt: '2026-11-01',
    updatedAt: '2026-11-02',
  },
];

describe('KanbanColumnComponent', () => {
  let fixture: ComponentFixture<KanbanColumnComponent>;
  let component: KanbanColumnComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KanbanColumnComponent],
    });

    fixture = TestBed.createComponent(KanbanColumnComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'TO DO');
    fixture.componentRef.setInput('tasks', mockTasks);
    fixture.detectChanges();
  });

  it('renders title and task count badge', () => {
    const title = fixture.debugElement.query(By.css('.column-title'));
    const badge = fixture.debugElement.query(By.css('.column-badge'));

    expect(title.nativeElement.textContent).toContain('TO DO');
    expect(badge.nativeElement.textContent.trim()).toBe('2');
  });

  it('renders task cards for provided tasks', () => {
    const cards = fixture.debugElement.queryAll(By.css('app-task-card'));
    expect(cards.length).toBe(2);
  });

  it('renders empty state when no tasks are present', () => {
    fixture.componentRef.setInput('tasks', []);
    fixture.componentRef.setInput('emptyMessage', 'Nothing here');
    fixture.componentRef.setInput('emptyIcon', 'sentiment_satisfied');
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.column-empty'));
    expect(empty).toBeTruthy();
    expect(empty.nativeElement.textContent).toContain('Nothing here');
  });

  it('emits selectTask, editTask, and deleteTask', () => {
    const selectSpy = vi.fn();
    const editSpy = vi.fn();
    const deleteSpy = vi.fn();

    component.selectTask.subscribe(selectSpy);
    component.editTask.subscribe(editSpy);
    component.deleteTask.subscribe(deleteSpy);

    component.selectTask.emit('t-col-1');
    component.editTask.emit(mockTasks[0]!);
    component.deleteTask.emit('t-col-1');

    expect(selectSpy).toHaveBeenCalledWith('t-col-1');
    expect(editSpy).toHaveBeenCalledWith(mockTasks[0]!);
    expect(deleteSpy).toHaveBeenCalledWith('t-col-1');
  });
});
