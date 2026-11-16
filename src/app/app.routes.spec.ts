import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, expect, it, beforeEach } from 'vitest';

import { routes } from './app.routes';

describe('App Routes and Lazy Navigation', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it(
    'redirects empty path "" to "/dashboard"',
    async () => {
      await router.navigateByUrl('');
      expect(location.path()).toBe('/dashboard');
    },
    30000,
  );

  it(
    'navigates to "/dashboard" lazy route successfully',
    async () => {
      await router.navigateByUrl('/dashboard');
      expect(location.path()).toBe('/dashboard');
    },
    30000,
  );

  it(
    'navigates to "/tasks" lazy route successfully',
    async () => {
      await router.navigateByUrl('/tasks');
      expect(location.path()).toBe('/tasks');
    },
    30000,
  );

  it(
    'redirects unknown wildcards "**" to "/dashboard"',
    async () => {
      await router.navigateByUrl('/some/non-existent/route');
      expect(location.path()).toBe('/dashboard');
    },
    30000,
  );
});
