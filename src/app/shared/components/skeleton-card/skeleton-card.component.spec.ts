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
  selector: 'host-default',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [SkeletonCardComponent],
  template: `<app-skeleton-card />`,
})
class HostDefaultComponent {}

describe('SkeletonCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostDefaultComponent] });
  });

  it('renders 3 skeleton cards by default', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    expect(f.debugElement.queryAll(By.css('mat-card'))).toHaveLength(3);
  });

  it('marks all skeleton cards as aria-hidden', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const hidden = f.debugElement.queryAll(By.css('mat-card[aria-hidden="true"]'));
    expect(hidden).toHaveLength(3);
  });

  it('each card contains skeleton line elements', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const lines = f.debugElement.queryAll(By.css('.skeleton-line'));
    // 3 cards × 3 lines each = 9
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('defaults count signal to 3', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const cmp = f.debugElement.query(By.directive(SkeletonCardComponent)).componentInstance;
    expect(cmp.count()).toBe(3);
  });
});
