import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AnalyticsPageComponent } from './analytics-page.component';
import { TaskStore } from '@tasks/store/task.store';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'desc',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: '2099-12-31',
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  assignee: { id: 'u1', name: 'Alice', avatar: '', email: 'a@a.com' },
  ...overrides,
});

const SAMPLE_TASKS: Task[] = [
  makeTask({
    id: '1',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    assignee: { id: 'u1', name: 'Alice', avatar: '', email: 'a@a.com' },
  }),
  makeTask({
    id: '2',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    assignee: { id: 'u2', name: 'Bob', avatar: '', email: 'b@b.com' },
  }),
  makeTask({
    id: '3',
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    assignee: { id: 'u1', name: 'Alice', avatar: '', email: 'a@a.com' },
    completedAt: new Date().toISOString(),
  }),
  makeTask({
    id: '4',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    assignee: { id: 'u3', name: 'Charlie', avatar: '', email: 'c@c.com' },
    completedAt: new Date().toISOString(),
  }),
];

describe('AnalyticsPageComponent', () => {
  let fixture: ComponentFixture<AnalyticsPageComponent>;
  let component: AnalyticsPageComponent;

  const tasksSignal = signal<Task[]>(SAMPLE_TASKS);

  const mockStore = {
    tasks: tasksSignal,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsPageComponent],
      providers: [{ provide: TaskStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render 4 summary cards', () => {
    const cards = fixture.debugElement.queryAll(By.css('.summary-card'));
    expect(cards.length).toBe(4);
  });

  it('should compute summaryCards with correct total', () => {
    const cards = component.summaryCards();
    const totalCard = cards.find((c) => c.label === 'Total Tasks');
    expect(totalCard?.value).toBe(4);
  });

  it('should compute summaryCards completed count', () => {
    const cards = component.summaryCards();
    const doneCard = cards.find((c) => c.label === 'Completed');
    expect(doneCard?.value).toBe(2);
  });

  it('should compute statusSegments returning 3 segments', () => {
    const segs = component.statusSegments();
    expect(segs.length).toBe(3);
  });

  it('should compute statusSegments values summing to total', () => {
    const segs = component.statusSegments();
    const total = segs.reduce((s, x) => s + x.value, 0);
    expect(total).toBe(SAMPLE_TASKS.length);
  });

  it('should compute prioritySegments returning 3 segments', () => {
    const segs = component.prioritySegments();
    expect(segs.length).toBe(3);
  });

  it('should compute prioritySegments values summing to total', () => {
    const segs = component.prioritySegments();
    const total = segs.reduce((s, x) => s + x.value, 0);
    expect(total).toBe(SAMPLE_TASKS.length);
  });

  it('should compute assigneeBarEntries grouped and sorted descending', () => {
    const entries = component.assigneeBarEntries();
    expect(entries.length).toBeGreaterThan(0);
    // Alice has 2 tasks, should be first
    expect(entries[0]?.label).toBe('Alice');
    expect(entries[0]?.value).toBe(2);
  });

  it('should compute weeklyBarEntries returning 7 entries', () => {
    const entries = component.weeklyBarEntries();
    expect(entries.length).toBe(7);
  });

  it('should render SVG donut circles for status', () => {
    const svgs = fixture.debugElement.queryAll(By.css('svg'));
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('should show empty state when no tasks', () => {
    tasksSignal.set([]);
    fixture.detectChanges();
    const empty = fixture.debugElement.query(By.css('.empty-state'));
    expect(empty).toBeTruthy();
  });

  it('should hide empty state when tasks exist', () => {
    tasksSignal.set(SAMPLE_TASKS);
    fixture.detectChanges();
    const empty = fixture.debugElement.query(By.css('.empty-state'));
    expect(empty).toBeNull();
  });
});
