import { HttpResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpCacheService } from './cache.service';

describe('HttpCacheService', () => {
  let service: HttpCacheService;

  beforeEach(() => {
    service = new HttpCacheService();
  });

  it('stores and retrieves cached HttpResponse', () => {
    const response = new HttpResponse({ body: { tasks: [{ id: '1' }] } });
    service.put('/tasks', response);

    const cached = service.get('/tasks');
    expect(cached).not.toBeNull();
    expect(cached?.body).toEqual({ tasks: [{ id: '1' }] });
  });

  it('returns null for nonexistent cache key', () => {
    expect(service.get('/nonexistent')).toBeNull();
  });

  it('expires and removes entry after TTL', () => {
    const response = new HttpResponse({ body: 'test' });
    service.put('/tasks', response, 100); // 100ms TTL

    expect(service.get('/tasks')).not.toBeNull();

    // Advance time past TTL
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 200);

    expect(service.get('/tasks')).toBeNull();
    expect(service.size).toBe(0);
  });

  it('invalidates entries starting with given prefix', () => {
    service.put('/tasks?page=1', new HttpResponse({ body: 'page1' }));
    service.put('/tasks?page=2', new HttpResponse({ body: 'page2' }));
    service.put('/users', new HttpResponse({ body: 'users' }));

    expect(service.size).toBe(3);

    service.invalidate('/tasks');

    expect(service.size).toBe(1);
    expect(service.get('/tasks?page=1')).toBeNull();
    expect(service.get('/users')).not.toBeNull();
  });

  it('clears all cached entries when invalidate is called without prefix or clear() is called', () => {
    service.put('/tasks', new HttpResponse({ body: 'tasks' }));
    service.put('/users', new HttpResponse({ body: 'users' }));

    expect(service.size).toBe(2);

    service.clear();

    expect(service.size).toBe(0);
  });
});
