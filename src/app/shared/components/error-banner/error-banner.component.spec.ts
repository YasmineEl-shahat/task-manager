import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { ErrorBannerComponent } from './error-banner.component';

describe('ErrorBannerComponent', () => {
  let fixture: ComponentFixture<ErrorBannerComponent>;
  let component: ErrorBannerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ErrorBannerComponent],
    });
    fixture = TestBed.createComponent(ErrorBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders with role="alert"', () => {
    const el = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(el).toBeTruthy();
  });

  it('displays the error message text container', () => {
    const msg = fixture.debugElement.query(By.css('.error-message'));
    expect(msg).toBeTruthy();
    expect(msg.nativeElement.textContent).toContain('An error occurred');
  });

  it('shows a Retry button by default', () => {
    const btn = fixture.debugElement.query(By.css('[aria-label="Retry the failed request"]'));
    expect(btn).toBeTruthy();
  });

  it('shows a Dismiss button by default', () => {
    const btn = fixture.debugElement.query(By.css('[aria-label="Dismiss error"]'));
    expect(btn).toBeTruthy();
  });

  it('emits retry when the Retry button is clicked', () => {
    const spy = vi.fn();
    component.retry.subscribe(spy);

    const btn = fixture.debugElement.query(By.css('[aria-label="Retry the failed request"]'));
    btn.nativeElement.click();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('emits dismiss when the close button is clicked', () => {
    const spy = vi.fn();
    component.dismiss.subscribe(spy);

    const btn = fixture.debugElement.query(By.css('[aria-label="Dismiss error"]'));
    btn.nativeElement.click();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('renders error icon', () => {
    const icon = fixture.debugElement.query(By.css('.error-icon'));
    expect(icon).toBeTruthy();
  });
});
