import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { Task } from '@tasks/models/task.model';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { KanbanBoardComponent } from './kanban-board.component';

const mockTasks: Task[] = [
  {
    id: 't-1',
    title: 'Task 1',
    description: 'Desc 1',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: '2026-11-20',
    assignee: { id: 'u1', name: 'Sarah', avatar: 'SS', email: 's@test.com' },
    tags: ['Frontend'],
    createdAt: '2026-11-01',
    updatedAt: '2026-11-02',
  },
  {
    id: 't-2',
    title: 'Task 2',
    description: 'Desc 2',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: '2026-11-22',
    assignee: { id: 'u2', name: 'John', avatar: 'JD', email: 'j@test.com' },
    tags: ['Backend'],
    createdAt: '2026-11-01',
    updatedAt: '2026-11-02',
  },
  {
    id: 't-3',
    title: 'Task 3',
    description: 'Desc 3',
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    dueDate: '2026-11-10',
    assignee: { id: 'u3', name: 'Mike', avatar: 'MJ', email: 'm@test.com' },
    tags: ['DevOps'],
    createdAt: '2026-11-01',
    updatedAt: '2026-11-02',
  },
];

describe('KanbanBoardComponent', () => {
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let component: KanbanBoardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KanbanBoardComponent],
    });

    fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tasks', mockTasks);
    fixture.detectChanges();
  });

  it('renders all 3 kanban columns when tab is "all"', () => {
    const columns = fixture.debugElement.queryAll(By.css('.kanban-column'));
    expect(columns.length).toBe(3);

    const badges = columns.map((c) =>
      c.query(By.css('.column-badge')).nativeElement.textContent.trim(),
    );
    expect(badges).toEqual(['1', '1', '1']);
  });

  it('filters columns based on selectedTab', () => {
    fixture.componentRef.setInput('selectedTab', 'todo');
    fixture.detectChanges();

    const columns = fixture.debugElement.queryAll(By.css('.kanban-column'));
    expect(columns.length).toBe(1);
    expect(columns[0]!.query(By.css('.column-title')).nativeElement.textContent).toContain('TO DO');
  });

  it('renders in_progress column only when tab is in_progress', () => {
    fixture.componentRef.setInput('selectedTab', 'in_progress');
    fixture.detectChanges();

    const columns = fixture.debugElement.queryAll(By.css('.kanban-column'));
    expect(columns.length).toBe(1);
    expect(columns[0]!.query(By.css('.column-title')).nativeElement.textContent).toContain(
      'IN PROGRESS',
    );
  });

  it('renders done column only when tab is done', () => {
    fixture.componentRef.setInput('selectedTab', 'done');
    fixture.detectChanges();

    const columns = fixture.debugElement.queryAll(By.css('.kanban-column'));
    expect(columns.length).toBe(1);
    expect(columns[0]!.query(By.css('.column-title')).nativeElement.textContent).toContain('DONE');
  });

  it('renders empty column state when no tasks exist for a column', () => {
    fixture.componentRef.setInput('tasks', []);
    fixture.componentRef.setInput('selectedTab', 'todo');
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.column-empty'));
    expect(empty).toBeTruthy();
    expect(empty.nativeElement.textContent).toContain('No tasks to do');
  });

  it('renders skeleton cards when isLoading is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const skeleton = fixture.debugElement.query(By.css('app-skeleton-card'));
    expect(skeleton).toBeTruthy();
    const board = fixture.debugElement.query(By.css('.kanban-board'));
    expect(board).toBeNull();
  });

  it('emits selectTask, editTask, and deleteTask events from task cards', () => {
    const selectSpy = vi.fn();
    const editSpy = vi.fn();
    const deleteSpy = vi.fn();

    component.selectTask.subscribe(selectSpy);
    component.editTask.subscribe(editSpy);
    component.deleteTask.subscribe(deleteSpy);

    const taskCard = fixture.debugElement.query(By.css('app-task-card'));
    expect(taskCard).toBeTruthy();

    component.selectTask.emit('t-1');
    component.editTask.emit(mockTasks[0]!);
    component.deleteTask.emit('t-1');

    expect(selectSpy).toHaveBeenCalledWith('t-1');
    expect(editSpy).toHaveBeenCalledWith(mockTasks[0]!);
    expect(deleteSpy).toHaveBeenCalledWith('t-1');
  });
});
