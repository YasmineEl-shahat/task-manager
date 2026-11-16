import {
  HttpContextToken,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpCacheService } from './cache.service';

export const BYPASS_CACHE = new HttpContextToken<boolean>(() => false);
export const CACHE_TTL = new HttpContextToken<number>(() => 60_000);

export const cacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const cache = inject(HttpCacheService);

  // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
  if (req.method !== 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          // Extract base resource path to invalidate related cached queries
          const urlBase = req.url.split('?')[0]?.replace(/\/[^/]+$/, '') ?? req.url;
          cache.invalidate(urlBase);
          cache.invalidate(req.url.split('?')[0]);
        }
      }),
    );
  }

  // Skip cache if explicitly requested
  if (req.context.get(BYPASS_CACHE)) {
    return next(req);
  }

  const cacheKey = req.urlWithParams;
  const cachedResponse = cache.get(cacheKey);

  if (cachedResponse) {
    return of(cachedResponse);
  }

  const ttl = req.context.get(CACHE_TTL);

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.put(cacheKey, event, ttl);
      }
    }),
  );
};
