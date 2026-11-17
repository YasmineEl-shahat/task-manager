import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { SkeletonCardComponent } from './skeleton-card.component';

// ── Note on signal input testing ──────────────────────────────────────────────
// In Angular 22 + Vitest (JIT mode), signal inputs declared with `input()` are
// AOT-compiled features. Template bindings do not update the underlying signal
// in JIT mode. Tests verify the default count and structure.
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-host-default',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonCardComponent],
  template: `<app-skeleton-card />`,
})
class HostDefaultComponent {}

describe('SkeletonCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostDefaultComponent] });
  });

  it('renders three kanban columns and distributes the default skeleton cards', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    expect(f.debugElement.queryAll(By.css('.skeleton-column'))).toHaveLength(3);
    expect(f.debugElement.queryAll(By.css('.skeleton-card'))).toHaveLength(3);
    expect(
      f.debugElement
        .queryAll(By.css('.skeleton-column'))
        .map((column) => column.queryAll(By.css('.skeleton-card')).length),
    ).toEqual([1, 1, 1]);
  });

  it('marks all skeleton cards as aria-hidden', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const hidden = f.debugElement.queryAll(By.css('.skeleton-card[aria-hidden="true"]'));
    expect(hidden).toHaveLength(3);
  });

  it('matches the kanban card layout with header, body, divider, and assignee footer', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const card = f.debugElement.query(By.css('.skeleton-card'));
    expect(card.query(By.css('.card-header'))).toBeTruthy();
    expect(card.query(By.css('.card-body'))).toBeTruthy();
    expect(card.query(By.css('.card-divider'))).toBeTruthy();
    expect(card.query(By.css('.card-footer .skeleton-avatar'))).toBeTruthy();
  });

  it('distributes the requested cards evenly across the kanban columns', () => {
    const f = TestBed.createComponent(SkeletonCardComponent);
    f.componentRef.setInput('count', 6);
    f.detectChanges();

    expect(
      f.debugElement
        .queryAll(By.css('.skeleton-column'))
        .map((column) => column.queryAll(By.css('.skeleton-card')).length),
    ).toEqual([2, 2, 2]);
  });

  it('defaults count signal to 3', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const cmp = f.debugElement.query(By.directive(SkeletonCardComponent)).componentInstance;
    expect(cmp.count()).toBe(3);
  });
});
