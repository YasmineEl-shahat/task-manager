import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;
  let component: StatCardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatCardComponent],
    });

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Total Tasks');
    fixture.componentRef.setInput('value', 156);
    fixture.detectChanges();
  });

  it('renders required title and value', () => {
    expect(component.title()).toBe('Total Tasks');
    expect(component.value()).toBe(156);

    const title = fixture.debugElement.query(By.css('.stat-title'));
    const value = fixture.debugElement.query(By.css('.stat-value'));

    expect(title.nativeElement.textContent).toBe('Total Tasks');
    expect(value.nativeElement.textContent).toBe('156');
  });

  it('renders icon with iconClass when provided', () => {
    fixture.componentRef.setInput('icon', 'bar_chart');
    fixture.componentRef.setInput('iconClass', 'total-icon');
    fixture.detectChanges();

    const icon = fixture.debugElement.query(By.css('.stat-icon'));
    expect(icon).toBeTruthy();
    expect(icon.nativeElement.textContent.trim()).toBe('bar_chart');
    expect(icon.nativeElement.classList.contains('total-icon')).toBe(true);
  });

  it('renders trend with positive indicator and trend icon', () => {
    fixture.componentRef.setInput('trend', '+12 this week');
    fixture.componentRef.setInput('trendType', 'positive');
    fixture.componentRef.setInput('trendIcon', 'trending_up');
    fixture.detectChanges();

    const trend = fixture.debugElement.query(By.css('.stat-trend'));
    expect(trend).toBeTruthy();
    expect(trend.nativeElement.textContent).toContain('+12 this week');
    expect(trend.nativeElement.classList.contains('trend-positive')).toBe(true);

    const trendIcon = fixture.debugElement.query(By.css('.trend-icon'));
    expect(trendIcon).toBeTruthy();
    expect(trendIcon.nativeElement.textContent.trim()).toBe('trending_up');
  });

  it('renders neutral trend without trend icon when omitted', () => {
    fixture.componentRef.setInput('trend', 'Same as yesterday');
    fixture.componentRef.setInput('trendType', 'neutral');
    fixture.detectChanges();

    const trend = fixture.debugElement.query(By.css('.stat-trend'));
    expect(trend.nativeElement.textContent).toContain('Same as yesterday');
    expect(trend.nativeElement.classList.contains('trend-neutral')).toBe(true);

    const trendIcon = fixture.debugElement.query(By.css('.trend-icon'));
    expect(trendIcon).toBeNull();
  });

  it('renders negative trend when configured', () => {
    fixture.componentRef.setInput('trend', '+3 today');
    fixture.componentRef.setInput('trendType', 'negative');
    fixture.detectChanges();

    const trend = fixture.debugElement.query(By.css('.stat-trend'));
    expect(trend.nativeElement.classList.contains('trend-negative')).toBe(true);
  });
});
