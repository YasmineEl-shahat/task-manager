import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@env';
import { CreateTaskDto, UpdateTaskDto } from '@tasks/models/task.dto';
import { Task } from '@tasks/models/task.model';

/**
 * Service responsible for Task **mutation** operations (POST / PUT / PATCH / DELETE).
 *
 * Reactive GET requests are handled via `httpResource` directly in `TaskStore`,
 * keeping this service lean and focused on write operations only.
 *
 * Every mutation:
 *  - Maps HTTP errors to a typed, human-readable `Error` via `handleError`
 */
@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = `${environment.apiBaseUrl}/tasks`;

  // ─── Create ──────────────────────────────────────────────────────────────

  /**
   * Creates a new task.
   *
   * @param dto - Payload conforming to {@link CreateTaskDto}.
   * @returns Observable wrapping the newly created {@link Task}.
   */
  createTask(dto: CreateTaskDto): Observable<Task> {
    return this.http
      .post<Task>(this.baseUrl, dto)
      .pipe(catchError(this.handleError));
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  /**
   * Fully replaces an existing task (PUT semantics).
   *
   * @param id  - ID of the task to replace.
   * @param dto - Full task payload.
   * @returns Observable wrapping the updated {@link Task}.
   */
  updateTask(id: string, dto: CreateTaskDto): Observable<Task> {
    return this.http
      .put<Task>(`${this.baseUrl}/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  /**
   * Partially updates an existing task (PATCH semantics).
   *
   * @param id  - ID of the task to patch.
   * @param dto - Partial task payload conforming to {@link UpdateTaskDto}.
   * @returns Observable wrapping the updated {@link Task}.
   */
  patchTask(id: string, dto: UpdateTaskDto): Observable<Task> {
    return this.http
      .patch<Task>(`${this.baseUrl}/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  /**
   * Deletes a task by its ID.
   *
   * @param id - ID of the task to delete.
   * @returns Observable that completes with `void` on success.
   */
  deleteTask(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ─── Error handling ──────────────────────────────────────────────────────

  /**
   * Maps an {@link HttpErrorResponse} to a typed `Error` with a user-readable message.
   *
   * - Network / CORS errors (status 0) → generic connectivity message.
   * - 4xx / 5xx responses             → message from the server body when available.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.status === 0
        ? 'Unable to reach the server. Please check your connection.'
        : ((error.error as { message?: string } | null)?.message ??
          `Server error ${error.status}: ${error.statusText}`);

    return throwError(() => new Error(message));
  }
}
