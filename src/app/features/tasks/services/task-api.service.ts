import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { environment } from '@env';
import { CreateTaskDto, UpdateTaskDto } from '@tasks/models/task.dto';
import { Task } from '@tasks/models/task.model';
import { TasksResponse } from '@tasks/models/tasks-response.model';

export interface TaskQueryParams {
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Service responsible for all Task CRUD operations against the REST API.
 *
 *
 * Every request:
 *  - retries once on transient network failures
 *  - maps HTTP errors to a typed, human-readable `Error` via `handleError`
 */
@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/tasks`;

  // ─── Read ────────────────────────────────────────────────────────────────

  /**
   * Fetches a paginated, optionally filtered list of tasks.
   *
   * @param params - Optional query parameters (status, priority, assigneeId, search, page, limit).
   * @returns Observable wrapping the full {@link TasksResponse} envelope.
   */
  getTasks(params?: TaskQueryParams): Observable<TasksResponse> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http
      .get<TasksResponse>(this.baseUrl, { params: httpParams })
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Fetches a single task by its ID.
   *
   * @param id - Unique task identifier.
   * @returns Observable wrapping the matching {@link Task}.
   */
  getTaskById(id: string): Observable<Task> {
    return this.http
      .get<Task>(`${this.baseUrl}/${id}`)
      .pipe(retry(1), catchError(this.handleError));
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  /**
   * Creates a new task.
   *
   * @param dto - Payload conforming to {@link CreateTaskDto}.
   * @returns Observable wrapping the newly created {@link Task} (with server-assigned id/timestamps).
   */
  createTask(dto: CreateTaskDto): Observable<Task> {
    return this.http
      .post<Task>(this.baseUrl, dto)
      .pipe(catchError(this.handleError));
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  /**
   * Fully replaces an existing task.
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
   * Partially updates an existing task (patch semantics).
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
    let message: string;

    if (error.status === 0) {
      // Network error or CORS issue — the response body is a ProgressEvent
      message = 'Unable to reach the server. Please check your connection.';
    } else {
      // Server returned a non-2xx status; prefer the server's own message
      message =
        (error.error as { message?: string } | null)?.message ??
        `Server error ${error.status}: ${error.statusText}`;
    }

    return throwError(() => new Error(message));
  }
}
