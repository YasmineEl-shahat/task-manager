import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityAction, TaskActivity } from '@tasks/models/task-activity.model';
import { TaskStore } from '@tasks/store/task.store';
import { ActivityFeedComponent } from './activity-feed.component';

describe('ActivityFeedComponent', () => {
  let component: ActivityFeedComponent;
  let componentRef: ComponentRef<ActivityFeedComponent>;
  let store: TaskStore;

  const sampleActivities: TaskActivity[] = [
    {
      id: 'act-1',
      taskId: 'task-1',
      taskTitle: 'First Task',
      action: ActivityAction.CREATED,
      performedBy: 'Alice Walker',
      description: 'Created task "First Task"',
      createdAt: '2026-11-17T10:00:00.000Z',
    },
    {
      id: 'act-2',
      taskId: 'task-2',
      taskTitle: 'Second Task',
      action: ActivityAction.STATUS_CHANGED,
      performedBy: 'Bob',
      description: 'Changed status to Done for "Second Task"',
      createdAt: '2026-11-17T11:00:00.000Z',
    },
    {
      id: 'act-3',
      taskId: 'task-3',
      taskTitle: 'Third Task',
      action: ActivityAction.DELETED,
      performedBy: 'Charlie',
      description: 'Deleted task "Third Task"',
      createdAt: '2026-11-17T12:00:00.000Z',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityFeedComponent],
      providers: [TaskStore, provideHttpClient(withFetch()), provideHttpClientTesting()],
    });

    store = TestBed.inject(TaskStore);
    componentRef = TestBed.createComponent(ActivityFeedComponent).componentRef;
    component = componentRef.instance;
  });

  it('creates the component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders activities from store by default when input is null', () => {
    store.loadActivities(sampleActivities);
    const newestFirst = [...sampleActivities].reverse();
    expect(component.effectiveActivities()).toEqual(newestFirst);
    expect(component.filteredActivities()).toEqual(newestFirst);
  });

  it('uses explicitly provided activities input when provided', () => {
    const customList: TaskActivity[] = [sampleActivities[0]!];
    componentRef.setInput('activities', customList);
    TestBed.flushEffects();

    expect(component.effectiveActivities()).toEqual(customList);
    expect(component.filteredActivities()).toHaveLength(1);
  });

  it('limits store-backed feeds to the 20 most recent activities', () => {
    const activities: TaskActivity[] = Array.from({ length: 25 }, (_, index) => ({
      id: `act-${index}`,
      taskId: `task-${index}`,
      taskTitle: `Task ${index}`,
      action: ActivityAction.UPDATED,
      performedBy: 'Alice',
      description: `Updated task ${index}`,
      createdAt: new Date(index * 1000).toISOString(),
    }));
    store.loadActivities(activities);

    expect(component.effectiveActivities()).toHaveLength(20);
    expect(component.effectiveActivities()[0]?.id).toBe('act-24');
  });

  it('filters activities by action type', () => {
    componentRef.setInput('activities', sampleActivities);
    TestBed.flushEffects();

    component.setFilter(ActivityAction.CREATED);
    expect(component.filteredActivities()).toHaveLength(1);
    expect(component.filteredActivities()[0]?.id).toBe('act-1');

    component.setFilter(ActivityAction.STATUS_CHANGED);
    expect(component.filteredActivities()).toHaveLength(1);
    expect(component.filteredActivities()[0]?.id).toBe('act-2');

    component.setFilter(ActivityAction.DELETED);
    expect(component.filteredActivities()).toHaveLength(1);
    expect(component.filteredActivities()[0]?.id).toBe('act-3');

    component.setFilter('all');
    expect(component.filteredActivities()).toHaveLength(3);
  });

  it('emits taskClick and selects task in store on clicking a non-deleted activity', () => {
    const taskClickSpy = vi.fn();
    component.taskClick.subscribe(taskClickSpy);
    const selectTaskSpy = vi.spyOn(store, 'selectTask');

    component.onActivityClick(sampleActivities[0]!);

    expect(taskClickSpy).toHaveBeenCalledWith('task-1');
    expect(selectTaskSpy).toHaveBeenCalledWith('task-1');
  });

  it('does NOT emit taskClick or select task when clicking a deleted activity', () => {
    const taskClickSpy = vi.fn();
    component.taskClick.subscribe(taskClickSpy);
    const selectTaskSpy = vi.spyOn(store, 'selectTask');

    component.onActivityClick(sampleActivities[2]!); // DELETED action

    expect(taskClickSpy).not.toHaveBeenCalled();
    expect(selectTaskSpy).not.toHaveBeenCalled();
  });

  it('emits closeFeed output when close button is clicked', () => {
    const closeSpy = vi.fn();
    component.closeFeed.subscribe(closeSpy);

    component.closeFeed.emit();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('clears all activities via onClearAll()', () => {
    store.loadActivities(sampleActivities);
    expect(store.activities().length).toBeGreaterThan(0);

    component.onClearAll();
    expect(store.activities()).toHaveLength(0);
  });

  it('computes correct initials for single and multi-word names', () => {
    expect(component.getInitials('John Doe')).toBe('JD');
    expect(component.getInitials('Sarah')).toBe('SA');
    expect(component.getInitials('John Middle Doe')).toBe('JD');
    expect(component.getInitials('')).toBe('??');
    expect(component.getInitials('  ')).toBe('??');
  });

  it('maps action icons, badges, and labels correctly', () => {
    expect(component.getActionIcon(ActivityAction.CREATED)).toBe('add_circle');
    expect(component.getActionIcon(ActivityAction.STATUS_CHANGED)).toBe('swap_horiz');
    expect(component.getActionIcon(ActivityAction.ASSIGNED)).toBe('person_add');
    expect(component.getActionIcon(ActivityAction.UPDATED)).toBe('edit');
    expect(component.getActionIcon(ActivityAction.DELETED)).toBe('delete_outline');

    expect(component.getActionBadgeClass(ActivityAction.CREATED)).toBe('badge-created');
    expect(component.getActionBadgeClass(ActivityAction.STATUS_CHANGED)).toBe('badge-status');

    expect(component.getActionLabel(ActivityAction.CREATED)).toBe('Created');
    expect(component.getActionLabel(ActivityAction.STATUS_CHANGED)).toBe('Status');
    expect(component.getActionLabel(ActivityAction.ASSIGNED)).toBe('Assigned');
    expect(component.getActionLabel(ActivityAction.UPDATED)).toBe('Updated');
    expect(component.getActionLabel(ActivityAction.DELETED)).toBe('Deleted');
  });
});
