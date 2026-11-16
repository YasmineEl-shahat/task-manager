import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MainLayoutComponent } from './main-layout.component';
import { TaskStore } from '@tasks/store/task.store';

describe('MainLayoutComponent', () => {
  let fixture: ComponentFixture<MainLayoutComponent>;
  let store: TaskStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        TaskStore,
        provideRouter([]),
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
      ],
    });

    store = TestBed.inject(TaskStore);
    fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
  });

  it('renders sidebar, topbar, and router outlet', () => {
    const sidebar = fixture.debugElement.query(By.css('app-sidebar'));
    const topbar = fixture.debugElement.query(By.css('app-topbar'));
    const outlet = fixture.debugElement.query(By.css('router-outlet'));

    expect(sidebar).toBeTruthy();
    expect(topbar).toBeTruthy();
    expect(outlet).toBeTruthy();
  });

  it('updates store filters when search changes from topbar', () => {
    const setFiltersSpy = vi.spyOn(store, 'setFilters');

    fixture.componentInstance['onGlobalSearch']('database');
    expect(setFiltersSpy).toHaveBeenCalledWith({ search: 'database' });
  });

  it('opens create task modal when openCreateTaskModal is called', async () => {
    const compDialog = (fixture.componentInstance as any).dialog;
    const spy = vi.spyOn(compDialog, 'open').mockReturnValue({} as any);

    await fixture.componentInstance['openCreateTaskModal']();
    expect(spy).toHaveBeenCalled();
  });
});

