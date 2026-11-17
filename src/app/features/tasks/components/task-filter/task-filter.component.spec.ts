import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { INITIAL_TASK_FILTERS } from '@tasks/models/task-filter.model';
import { TaskFilterPriority, TaskFilterStatus } from '@tasks/models/task.enums';
import { TaskFilterComponent } from './task-filter.component';

describe('TaskFilterComponent', () => {
  let fixture: ComponentFixture<TaskFilterComponent>;
  let component: TaskFilterComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskFilterComponent],
      providers: [provideAnimationsAsync()],
    });

    fixture = TestBed.createComponent(TaskFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders search input with initial empty value', () => {
    const input = fixture.debugElement.query(By.css('input[matInput]'));
    expect(input.nativeElement.value).toBe('');
  });

  it('emits search query when input changes', () => {
    const spy = vi.fn();
    component.filtersChange.subscribe(spy);

    const input = fixture.debugElement.query(By.css('input[matInput]'));
    input.nativeElement.value = 'authentication';
    input.nativeElement.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith({ search: 'authentication' });
  });

  it('shows clear button and clears search when clicked', () => {
    const spy = vi.fn();
    component.filtersChange.subscribe(spy);

    fixture.componentRef.setInput('filters', {
      ...INITIAL_TASK_FILTERS,
      search: 'budget',
    });
    fixture.detectChanges();

    const clearBtn = fixture.debugElement.query(By.css('[aria-label="Clear search"]'));
    expect(clearBtn).toBeTruthy();

    clearBtn.nativeElement.click();
    expect(spy).toHaveBeenCalledWith({ search: '' });
  });

  it('emits status filter change when selection changes', () => {
    const spy = vi.fn();
    component.filtersChange.subscribe(spy);

    component['onStatusChange'](TaskFilterStatus.IN_PROGRESS);
    expect(spy).toHaveBeenCalledWith({ status: TaskFilterStatus.IN_PROGRESS });
  });

  it('emits priority filter change when selection changes', () => {
    const spy = vi.fn();
    component.filtersChange.subscribe(spy);

    component['onPriorityChange'](TaskFilterPriority.HIGH);
    expect(spy).toHaveBeenCalledWith({ priority: TaskFilterPriority.HIGH });
  });

  it('shows reset button only when filters are active and emits resetFilters on click', () => {
    const resetSpy = vi.fn();
    component.resetFilters.subscribe(resetSpy);

    // Initial state: no reset button
    expect(fixture.debugElement.query(By.css('[aria-label="Reset all filters"]'))).toBeNull();

    // Active filter state: reset button appears
    fixture.componentRef.setInput('filters', {
      ...INITIAL_TASK_FILTERS,
      status: TaskFilterStatus.DONE,
    });
    fixture.detectChanges();

    const resetBtn = fixture.debugElement.query(By.css('[aria-label="Reset all filters"]'));
    expect(resetBtn).toBeTruthy();

    resetBtn.nativeElement.click();
    expect(resetSpy).toHaveBeenCalledOnce();
  });
});
