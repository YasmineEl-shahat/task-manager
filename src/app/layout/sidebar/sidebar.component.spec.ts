import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { SidebarComponent } from './sidebar.component';
import { DEFAULT_NAV_ITEMS, NAV_ITEMS } from './nav-items.constants';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders navigation links for Dashboard and Tasks', () => {
    const links = fixture.debugElement.queryAll(By.css('a.nav-item'));
    expect(links.length).toBeGreaterThanOrEqual(2);

    const dashboardLink = links.find((l) => l.nativeElement.textContent.includes('Dashboard'));
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink?.nativeElement.getAttribute('href')).toBe('/dashboard');
  });

  it('renders all default navigation items dynamically', () => {
    const links = fixture.debugElement.queryAll(By.css('a.nav-item'));
    expect(links.length).toBe(6);
    expect(component.navItems().length).toBe(6);
  });

  it('verifies DEFAULT_NAV_ITEMS constants', () => {
    expect(DEFAULT_NAV_ITEMS.length).toBe(6);
    expect(NAV_ITEMS).toEqual(DEFAULT_NAV_ITEMS);
    expect(DEFAULT_NAV_ITEMS[0]?.path).toBe('/dashboard');
  });

  it('renders custom nav items when provided via input', () => {
    fixture.componentRef.setInput('navItems', [
      { label: 'Custom Route', path: '/custom', icon: 'star' },
    ]);
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('a.nav-item'));
    expect(links.length).toBe(1);
    expect(links[0]!.nativeElement.textContent).toContain('Custom Route');
  });

  it('emits createNewTask when New Task button is clicked', () => {
    const spy = vi.fn();
    component.createNewTask.subscribe(spy);

    const btn = fixture.debugElement.query(By.css('.new-task-btn'));
    btn.nativeElement.click();

    expect(spy).toHaveBeenCalledOnce();
  });
});
