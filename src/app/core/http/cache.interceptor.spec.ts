import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { BYPASS_CACHE, cacheInterceptor } from './cache.interceptor';
import { HttpCacheService } from './cache.service';

describe('cacheInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let cacheService: HttpCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(HttpCacheService);
    cacheService.clear();
  });

  it('passes initial GET request to network and stores response in cache', () => {
    const mockData = [{ id: '1', title: 'Task 1' }];

    http.get('/tasks').subscribe((data) => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne('/tasks');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);

    // Verify it is cached
    expect(cacheService.get('/tasks')).not.toBeNull();
  });

  it('serves subsequent identical GET request from cache without network call', () => {
    const mockData = [{ id: '1', title: 'Task 1' }];

    // 1st call -> network
    http.get('/tasks').subscribe();
    httpMock.expectOne('/tasks').flush(mockData);

    // 2nd call -> cache hit
    let cachedResult: unknown = null;
    http.get('/tasks').subscribe((data) => {
      cachedResult = data;
    });

    // No network request should be dispatched
    httpMock.expectNone('/tasks');
    expect(cachedResult).toEqual(mockData);
  });

  it('bypasses cache when BYPASS_CACHE context is set to true', () => {
    const mockData = [{ id: '1', title: 'Task 1' }];

    // Prime the cache
    http.get('/tasks').subscribe();
    httpMock.expectOne('/tasks').flush(mockData);

    // Subsequent call with BYPASS_CACHE
    const context = new HttpContext().set(BYPASS_CACHE, true);
    http.get('/tasks', { context }).subscribe();

    // Should make network call despite cache being warm
    const req = httpMock.expectOne('/tasks');
    req.flush(mockData);
  });

  it('invalidates cache when a mutating request (POST) succeeds', () => {
    const mockData = [{ id: '1', title: 'Task 1' }];

    // Prime the cache
    http.get('/tasks').subscribe();
    httpMock.expectOne('/tasks').flush(mockData);
    expect(cacheService.get('/tasks')).not.toBeNull();

    // Perform POST mutation
    http.post('/tasks', { title: 'New Task' }).subscribe();
    httpMock.expectOne('/tasks').flush({ id: '2', title: 'New Task' });

    // Cache should now be invalidated
    expect(cacheService.get('/tasks')).toBeNull();
  });
});
