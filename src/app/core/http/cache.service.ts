import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

export interface CacheEntry {
  response: HttpResponse<unknown>;
  expiry: number;
}

@Injectable({
  providedIn: 'root',
})
export class HttpCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultTtlMs = 60_000; // 1 minute

  get(key: string): HttpResponse<unknown> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.response.clone();
  }

  put(key: string, response: HttpResponse<unknown>, ttlMs = this.defaultTtlMs): void {
    this.cache.set(key, {
      response: response.clone(),
      expiry: Date.now() + ttlMs,
    });
  }

  invalidate(urlPrefix?: string): void {
    if (!urlPrefix) {
      this.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(urlPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
