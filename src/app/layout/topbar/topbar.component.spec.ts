import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { TopbarComponent } from './topbar.component';

describe('TopbarComponent', () => {
  let fixture: ComponentFixture<TopbarComponent>;
  let component: TopbarComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TopbarComponent],
    });

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders search input with placeholder', () => {
    const input = fixture.debugElement.query(By.css('.search-input'));
    expect(input).toBeTruthy();
    expect(input.nativeElement.getAttribute('placeholder')).toBe('Search tasks...');
  });

  it('emits searchChange when search input changes', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    const input = fixture.debugElement.query(By.css('.search-input'));
    input.nativeElement.value = 'refactor';
    input.nativeElement.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith('refactor');
  });

  it('renders user avatar with JD initials', () => {
    const avatar = fixture.debugElement.query(By.css('.user-initials'));
    expect(avatar.nativeElement.textContent).toContain('JD');
  });

  it('renders brand icon and title', () => {
    const brandName = fixture.nativeElement.querySelector('.brand-name');
    expect(brandName?.textContent).toContain('Task Manager');

    const brandLogo = fixture.nativeElement.querySelector('.brand-logo');
    expect(brandLogo).toBeTruthy();
    const brandIcon = brandLogo?.querySelector('svg');
    expect(brandIcon).toBeTruthy();
  });

  it('emits notificationClick when notification button is clicked', () => {
    const spy = vi.fn();
    component.notificationClick.subscribe(spy);

    const btn = fixture.debugElement.query(By.css('.notification-btn'));
    btn.nativeElement.click();

    expect(spy).toHaveBeenCalled();
  });

  it('displays activity count badge when activityCount > 0', () => {
    expect(fixture.debugElement.query(By.css('.notification-badge'))).toBeNull();

    fixture.componentRef.setInput('activityCount', 5);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.notification-badge'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent).toContain('5');
  });
});
