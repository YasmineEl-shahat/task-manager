import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { LoadingSpinnerComponent } from './loading-spinner.component';

@Component({
  selector: 'host-default',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [LoadingSpinnerComponent],
  template: `<app-loading-spinner />`,
})
class HostDefaultComponent {}

describe('LoadingSpinnerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostDefaultComponent, LoadingSpinnerComponent],
    }).compileComponents();
  });

  it('renders a spinner host with role="status"', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    expect(f.debugElement.query(By.css('[role="status"]'))).toBeTruthy();
  });

  it('renders a mat-spinner element', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    expect(f.debugElement.query(By.css('mat-spinner'))).toBeTruthy();
  });

  it('shows the default label "Loading…"', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const label = f.debugElement.query(By.css('.spinner-label'));
    expect(label.nativeElement.textContent).toContain('Loading…');
  });

  it('defaults to diameter=48', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const cmp = f.debugElement.query(By.directive(LoadingSpinnerComponent)).componentInstance;
    expect(cmp.diameter()).toBe(48);
  });

  it('defaults to label="Loading…"', () => {
    const f = TestBed.createComponent(HostDefaultComponent);
    f.detectChanges();
    const cmp = f.debugElement.query(By.directive(LoadingSpinnerComponent)).componentInstance;
    expect(cmp.label()).toBe('Loading…');
  });
});
