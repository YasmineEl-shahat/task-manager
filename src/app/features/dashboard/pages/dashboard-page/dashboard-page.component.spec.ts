import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskFilterPriority, TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskStore } from '@tasks/store/task.store';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let component: DashboardPageComponent;
  let dialog: MatDialog;

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Prepare Q4 budget report',
      description: 'Compile and analyze financial data',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: '2026-11-20T10:00:00.000Z',
      assignee: { id: 'u1', name: 'Sarah', avatar: 'SS', email: 's@test.com' },
      tags: ['Finance'],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Update payment gateway',
      description: 'Migrate to new payment provider',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: '2026-11-21T10:00:00.000Z',
      assignee: { id: 'u2', name: 'John', avatar: 'JD', email: 'j@test.com' },
      tags: ['Backend'],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'task-3',
      title: 'Fix critical login bug',
      description: 'Resolved issue preventing users from logging in',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: '2026-11-15T10:00:00.000Z',
      assignee: { id: 'u3', name: 'Mike', avatar: 'MJ', email: 'm@test.com' },
      tags: ['Bug Fix'],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      completedAt: '2026-11-15T12:00:00.000Z',
    },
  ];

  const mockStore = {
    filteredTasks: signal(mockTasks),
    stats: signal({
      total: 156,
      todo: 25,
      inProgress: 42,
      done: 89,
      overdue: 25,
      highPriority: 50,
    }),
    filters: signal({
      status: 'all',
      priority: 'all',
      assigneeId: null,
      search: '',
    }),
    isLoading: signal(false),
    error: signal<string | null>(null),
    setFilters: vi.fn(),
    selectTask: vi.fn(),
    deleteTask: vi.fn(),
    retryLoad: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockStore.filteredTasks.set(mockTasks);
    mockStore.isLoading.set(false);
    mockStore.error.set(null);

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: TaskStore, useValue: mockStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as any);

    fixture.detectChanges();
  });

  it('renders dashboard with 4 stats cards', () => {
    const statCards = fixture.debugElement.queryAll(By.css('.stat-card'));
    expect(statCards.length).toBe(4);

    const values = statCards.map(
      (c) => c.query(By.css('.stat-value')).nativeElement.textContent.trim(),
    );
    expect(values).toEqual(['156', '89', '42', '25']);
  });

  it('renders 3 kanban columns in "all" view mode with correct task counts', () => {
    expect(component.selectedTab()).toBe('all');
    const columns = fixture.debugElement.queryAll(By.css('.kanban-column'));
    expect(columns.length).toBe(3);

    expect(component.todoTasks().length).toBe(1);
    expect(component.inProgressTasks().length).toBe(1);
    expect(component.doneTasks().length).toBe(1);
  });

  it('filters kanban view when selecting a single status tab', () => {
    component.onTabSelect('todo');
    fixture.detectChanges();

    const columns = fixture.debugElement.queryAll(By.css('.kanban-column'));
    expect(columns.length).toBe(1);
    const title = columns[0]!.query(By.css('.column-title')).nativeElement.textContent;
    expect(title).toContain('TO DO');
  });

  it('dispatches filter change to store when priority changes', () => {
    component.onPriorityChange(TaskFilterPriority.HIGH);
    expect(mockStore.setFilters).toHaveBeenCalledWith({
      priority: TaskFilterPriority.HIGH,
    });
  });

  it('opens confirmation dialog and deletes task on confirmed', () => {
    component.onTaskDelete(mockTasks[0]!.id);
    expect(dialog.open).toHaveBeenCalled();
    expect(mockStore.deleteTask).toHaveBeenCalledWith(mockTasks[0]!.id);
  });

  it('selects task on onTaskSelect', () => {
    component.onTaskSelect(mockTasks[0]!.id);
    expect(mockStore.selectTask).toHaveBeenCalledWith(mockTasks[0]!.id);
  });

  it('opens create modal on openCreateModal', async () => {
    await component.openCreateModal();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('opens edit modal on onTaskEdit', async () => {
    await component.onTaskEdit(mockTasks[0]!);
    expect(dialog.open).toHaveBeenCalled();
  });

  it('renders skeleton cards when loading', () => {
    mockStore.isLoading.set(true);
    fixture.detectChanges();

    const skeleton = fixture.debugElement.query(By.css('app-skeleton-card'));
    expect(skeleton).toBeTruthy();
  });

  it('renders error banner when store has an error', () => {
    mockStore.error.set('Network connection failed');
    fixture.detectChanges();

    const errorBanner = fixture.debugElement.query(By.css('app-error-banner'));
    expect(errorBanner).toBeTruthy();
  });
});
