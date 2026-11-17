import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEAM_MEMBERS } from '@features/team/data/team-members.data';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskStore } from '@tasks/store/task.store';
import { TeamPageComponent } from './team-page.component';

describe('TeamPageComponent', () => {
  let fixture: ComponentFixture<TeamPageComponent>;
  let component: TeamPageComponent;
  let dialog: MatDialog;

  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Open task',
      description: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: '2026-12-01',
      assignee: TEAM_MEMBERS[0]!,
      tags: [],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Completed task',
      description: '',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: '2026-12-01',
      assignee: TEAM_MEMBERS[0]!,
      tags: [],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  const mockStore = {
    tasks: signal(tasks),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [TeamPageComponent],
      providers: [provideAnimationsAsync(), { provide: TaskStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamPageComponent);
    component = fixture.componentInstance;
    dialog = (component as unknown as { dialog: MatDialog }).dialog;
    vi.spyOn(dialog, 'open').mockReturnValue({} as MatDialogRef<unknown>);
    fixture.detectChanges();
  });

  it('renders the mocked team list and member count', () => {
    expect(fixture.debugElement.queryAll(By.css('.member-card'))).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('4 members');
  });

  it('shows each member task workload', () => {
    const firstMember = fixture.debugElement.query(By.css('.member-card'));
    const workload = firstMember.query(By.css('.workload')).nativeElement.textContent;

    expect(workload).toContain('1Open');
    expect(workload).toContain('1Completed');
    expect(workload).toContain('2Total tasks');
  });

  it('filters members by name, email, and role', () => {
    component.searchQuery.set('sarah.smith@company.com');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.member-card'))).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Sarah Smith');

    component.searchQuery.set('QA Engineer');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.member-card'))).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Emily Davis');
  });

  it('shows an empty state when no team members match', () => {
    component.searchQuery.set('nobody');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.empty-state'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('.member-card'))).toHaveLength(0);
  });

  it('opens the task form with the selected member pre-assigned', async () => {
    await component.assignTask(TEAM_MEMBERS[1]!);

    expect(dialog.open).toHaveBeenCalledOnce();
    const options = vi.mocked(dialog.open).mock.calls[0]?.[1];
    expect(options?.data).toEqual({ assigneeId: TEAM_MEMBERS[1]!.id });
  });
});
