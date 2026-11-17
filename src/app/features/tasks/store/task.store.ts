import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { httpResource } from '@angular/common/http';
import { EMPTY, Subject } from 'rxjs';
import { catchError, concatMap, exhaustMap, finalize, tap } from 'rxjs/operators';

import { environment } from '@env';
import { CreateTaskDto, UpdateTaskDto } from '@tasks/models/task.dto';
import { INITIAL_TASK_FILTERS, TaskFilters } from '@tasks/models/task-filter.model';
import { TaskFilterPriority, TaskFilterStatus, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TasksResponse } from '@tasks/models/tasks-response.model';
import {
  ActivityAction,
  INITIAL_ACTIVITIES,
  TaskActivity,
} from '@tasks/models/task-activity.model';
import { TaskApiService } from '@tasks/services/task-api.service';

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Signal-based store for the Task feature.
 *
 * **Read strategy — `httpResource`**
 * The task list and selected-task detail are fetched via `httpResource`, which
 * is reactive on signal dependencies: changing `_filters` or `_selectedTaskId`
 * automatically cancels the in-flight request and issues a new one. No manual
 * "load" trigger or `switchMap` pipe is needed.
 *
 * **Write strategy — RxJS + `HttpClient`**
 * Mutations (create / update / patch / delete) go through `exhaustMap` pipelines
 * that call `TaskApiService`. After each successful write the tasks resource is
 * reloaded so the list stays in sync with the server.
 *
 * **Cleanup**
 * `takeUntilDestroyed()` wires mutation subscriptions to the injection context's
 * destroy event, so no manual `unsubscribe` is needed.
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(TaskApiService);
  private readonly baseUrl = environment.apiBaseUrl + '/tasks';

  // ─── Filter state (drives the reactive resource) ─────────────────────────

  private readonly _filters = signal<TaskFilters>(INITIAL_TASK_FILTERS);
  readonly filters = this._filters.asReadonly();

  // ─── Selected task state ─────────────────────────────────────────────────

  private readonly _selectedTaskId = signal<string | null>(null);
  readonly selectedTaskId = this._selectedTaskId.asReadonly();

  // ─── Mutation state ───────────────────────────────────────────────────────

  private readonly _isMutating = signal(false);
  readonly isMutating = this._isMutating.asReadonly();
  private readonly _taskOrder = signal<readonly string[]>([]);
  private readonly _taskStatusOverrides = signal<Readonly<Record<string, TaskStatus>>>({});
  private readonly moveVersions = new Map<string, number>();
  private pendingMoves = 0;

  /** Error from the last failed mutation (not from the resource). */
  private readonly _mutationError = signal<string | null>(null);

  /** Incremented each time the user manually retries a failed load. */
  private readonly _retryCount = signal(0);
  /** Number of manual retries the user has attempted for the current error. */
  readonly retryCount = this._retryCount.asReadonly();

  // ─── Activity state ───────────────────────────────────────────────────────

  private readonly _activities = signal<TaskActivity[]>([...INITIAL_ACTIVITIES]);
  /** Complete list of task activities, ordered newest first. */
  readonly activities = this._activities.asReadonly();

  /** Top 20 most recent task activities. */
  readonly recentActivities = computed(() => this._activities().slice(0, 20));

  private readonly _isLoadingActivities = signal(false);
  readonly isLoadingActivities = this._isLoadingActivities.asReadonly();

  private readonly _activityLoadError = signal<string | null>(null);
  private readonly _activitySaveError = signal<string | null>(null);
  readonly activityError = computed(() => this._activitySaveError() ?? this._activityLoadError());

  private activitiesLoaded = false;
  private readonly locallyLoggedActivityIds = new Set<string>();

  /** Whether the slide-over activity feed drawer is open. */
  private readonly _isActivityPanelOpen = signal<boolean>(false);
  readonly isActivityPanelOpen = this._isActivityPanelOpen.asReadonly();

  // ─── httpResource — task list ─────────────────────────────────────────────

  /**
   * Reactive resource for the paginated / filtered task list.
   *
   * Re-fetches automatically whenever `_filters` changes.
   * Returns `undefined` while loading or on error (use `isLoading` / `error`).
   */
  private readonly _tasksResource = httpResource<TasksResponse>(() => {
    const { status, priority, assigneeId, search } = this._filters();

    // Build only the params that deviate from "show everything"
    const params: Record<string, string> = {};
    if (status !== TaskFilterStatus.ALL) params['status'] = status;
    if (priority !== TaskFilterPriority.ALL) params['priority'] = priority;
    if (assigneeId !== null) params['assigneeId'] = assigneeId;
    if (search.trim()) params['search'] = search.trim();

    return { url: this.baseUrl, params };
  });

  // ─── httpResource — selected task detail ─────────────────────────────────

  /**
   * Reactive resource for the currently selected task's full detail.
   *
   * Returns `undefined` (and fires no request) when nothing is selected.
   * Re-fetches automatically when `_selectedTaskId` changes.
   */
  private readonly _selectedTaskResource = httpResource<Task>(() => {
    const id = this._selectedTaskId();
    return id ? { url: `${this.baseUrl}/${id}` } : undefined;
  });

  // ─── Public derived signals ───────────────────────────────────────────────

  /** Raw task list from the server (empty array while loading). */
  readonly tasks = computed<Task[]>(() => {
    const raw = this._tasksResource.value();
    if (!raw) return [];
    const tasks = Array.isArray(raw)
      ? raw
      : 'tasks' in raw && Array.isArray(raw.tasks)
        ? raw.tasks
        : [];
    const overrides = this._taskStatusOverrides();
    const order = new Map(this._taskOrder().map((id, index) => [id, index]));
    return tasks
      .map((task) => {
        const status = overrides[task.id];
        return status ? { ...task, status } : task;
      })
      .sort(
        (a, b) =>
          (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
  });

  /** Total count from the server-side pagination meta or task list length. */
  readonly totalCount = computed(() => {
    const raw = this._tasksResource.value();
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.length;
    return raw.meta?.totalCount ?? raw.tasks?.length ?? 0;
  });

  /** ISO timestamp of the last server update from meta. */
  readonly lastUpdated = computed(() => {
    const raw = this._tasksResource.value();
    if (!raw || Array.isArray(raw)) return null;
    return raw.meta?.lastUpdated ?? null;
  });

  /** `true` while the task list is being (re)fetched. */
  readonly isLoading = this._tasksResource.isLoading;

  /** `true` while the selected-task detail is being fetched. */
  readonly isSelectedTaskLoading = this._selectedTaskResource.isLoading;

  /** `true` while a mutation request is in-flight. */
  readonly isBusy = computed(() => this._tasksResource.isLoading() || this._isMutating());

  /**
   * Combined error signal — surfaces either a mutation error or the resource
   * fetch error, whichever is most recent. `null` when everything is healthy.
   */
  readonly error = computed<string | null>(() => {
    const mutErr = this._mutationError();
    if (mutErr) return mutErr;

    const resErr = this._tasksResource.error();
    if (!resErr) return null;
    return resErr instanceof Error ? resErr.message : 'Failed to load tasks.';
  });

  /**
   * Full detail of the currently selected task, or `null` when nothing is
   * selected or the detail request is still in flight.
   */
  readonly selectedTask = computed(() => this._selectedTaskResource.value() ?? null);

  // ─── Derived / computed signals ───────────────────────────────────────────

  /**
   * Client-side filtered + searched slice of the task list.
   *
   * Because filters are also sent to the API, this computed is primarily useful
   * for the `search` field (instant feedback before the round-trip completes)
   * and as a safety net for any stale data.
   */
  readonly filteredTasks = computed(() => {
    const tasks = this.tasks();
    const { status, priority, assigneeId, search } = this._filters();
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus =
        status === TaskFilterStatus.ALL || (task.status as unknown as TaskFilterStatus) === status;

      const matchesPriority =
        priority === TaskFilterPriority.ALL ||
        (task.priority as unknown as TaskFilterPriority) === priority;

      const matchesAssignee = assigneeId === null || task.assignee.id === assigneeId;

      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);

      return matchesStatus && matchesPriority && matchesAssignee && matchesSearch;
    });
  });

  /** Aggregate statistics derived from the full task list. */
  readonly stats = computed(() => {
    const tasks = this.tasks();
    const now = new Date();

    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter((t) => {
        if (t.status === 'done') return false;
        if (t.isOverdue !== undefined) return t.isOverdue;
        const due = new Date(`${t.dueDate}T00:00:00`);
        return !Number.isNaN(due.getTime()) && due < now;
      }).length,
    };
  });

  // ─── Action subjects (mutation pipelines) ────────────────────────────────

  private readonly createTask$ = new Subject<CreateTaskDto>();
  private readonly updateTask$ = new Subject<{ id: string; dto: CreateTaskDto }>();
  private readonly patchTask$ = new Subject<{ id: string; dto: UpdateTaskDto }>();
  private readonly deleteTask$ = new Subject<string>();
  private readonly moveTask$ = new Subject<{
    id: string;
    status: TaskStatus;
    previousStatus: TaskStatus;
  }>();

  // ─── Constructor — wire up mutation pipelines ─────────────────────────────

  constructor() {
    this.registerCreatePipeline();
    this.registerUpdatePipeline();
    this.registerPatchPipeline();
    this.registerDeletePipeline();
    this.registerMoveTaskPipeline();
  }

  // ─── Public command API ───────────────────────────────────────────────────

  /**
   * Manually triggers a fresh reload of the task list from the server.
   * Useful after external changes (e.g. another user's edits).
   */
  reload(): void {
    this._tasksResource.reload();
  }

  /**
   * Retries the last failed resource load.
   * Increments `retryCount` so the template can show retry progress
   * and clears any stale mutation error before reloading.
   */
  retryLoad(): void {
    this._retryCount.update((n) => n + 1);
    this._mutationError.set(null);
    this._tasksResource.reload();
  }

  /** Dispatches a create-task mutation. */
  createTask(dto: CreateTaskDto): void {
    this.createTask$.next(dto);
  }

  /** Dispatches a full-replace (PUT) mutation. */
  updateTask(id: string, dto: CreateTaskDto): void {
    this.updateTask$.next({ id, dto });
  }

  /** Dispatches a partial-update (PATCH) mutation. */
  patchTask(id: string, dto: UpdateTaskDto): void {
    this.patchTask$.next({ id, dto });
  }

  /** Dispatches a delete mutation. */
  deleteTask(id: string): void {
    this.deleteTask$.next(id);
  }

  /** Reorders visible tasks immediately and persists status changes in sequence. */
  moveTask(id: string, status: TaskStatus, orderedTaskIds: readonly string[]): void {
    const existingIds = this._taskOrder();
    this._taskOrder.set([
      ...orderedTaskIds,
      ...existingIds.filter((taskId) => !orderedTaskIds.includes(taskId)),
    ]);

    const task = this.tasks().find((item) => item.id === id);
    if (!task || task.status === status) return;

    const version = (this.moveVersions.get(id) ?? 0) + 1;
    this.moveVersions.set(id, version);
    this._taskStatusOverrides.update((current) => ({ ...current, [id]: status }));
    this._mutationError.set(null);
    this.pendingMoves += 1;
    this._isMutating.set(true);
    this.moveTask$.next({ id, status, previousStatus: task.status });
  }

  /** Selects a task by ID; pass `null` to clear the selection. */
  selectTask(id: string | null): void {
    this._selectedTaskId.set(id);
  }

  /** Merges `partial` into the current filter state. */
  setFilters(partial: Partial<TaskFilters>): void {
    this._filters.update((current) => ({ ...current, ...partial }));
  }

  /** Resets all filters to their initial (show-everything) values. */
  resetFilters(): void {
    this._filters.set(INITIAL_TASK_FILTERS);
  }

  /**
   * Clears any mutation error.
   * Resource errors clear automatically on the next successful load.
   */
  clearError(): void {
    this._mutationError.set(null);
  }

  // ─── Activity panel commands ─────────────────────────────────────────────

  /** Toggles the activity panel drawer open/closed state. */
  toggleActivityPanel(): void {
    const isOpen = !this._isActivityPanelOpen();
    this._isActivityPanelOpen.set(isOpen);
    if (isOpen) this.loadActivityHistory();
  }

  /** Opens the activity panel drawer. */
  openActivityPanel(): void {
    this._isActivityPanelOpen.set(true);
    this.loadActivityHistory();
  }

  /** Closes the activity panel drawer. */
  closeActivityPanel(): void {
    this._isActivityPanelOpen.set(false);
  }

  /** Clears all recorded activities. */
  clearActivities(): void {
    this._activities.set([]);
    this._activityLoadError.set(null);
    this._activitySaveError.set(null);
  }

  /** Replaces or hydrates activities from an external source. */
  loadActivities(activities: TaskActivity[]): void {
    this.activitiesLoaded = true;
    this._activities.set(this.orderActivities(activities));
    this._activityLoadError.set(null);
  }

  /**
   * Logs a new task activity into the feed.
   *
   * Prepends the activity to `_activities` so recent updates appear immediately at the top.
   */
  logActivity(
    action: ActivityAction,
    taskId: string,
    taskTitle: string,
    description: string,
    performedBy = 'John Doe',
  ): TaskActivity {
    const activity: TaskActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      taskId,
      taskTitle,
      action,
      performedBy,
      description,
      createdAt: new Date().toISOString(),
    };

    this.locallyLoggedActivityIds.add(activity.id);
    this._activities.update((current) => [activity, ...current]);

    this._activitySaveError.set(null);
    this.api
      .logActivity(activity)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (savedActivity) => {
          this._activities.update((current) =>
            this.orderActivities(
              current.map((item) => (item.id === activity.id ? savedActivity : item)),
            ),
          );
          this._activitySaveError.set(null);
        },
        error: (error: Error) => this._activitySaveError.set(error.message),
      });

    return activity;
  }

  private loadActivityHistory(): void {
    if (this.activitiesLoaded || this._isLoadingActivities()) return;

    this._isLoadingActivities.set(true);
    this._activityLoadError.set(null);
    this.api
      .getActivities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activities) => {
          this.activitiesLoaded = true;
          const remoteIds = new Set(activities.map((activity) => activity.id));
          const localActivities = this._activities().filter(
            (activity) =>
              this.locallyLoggedActivityIds.has(activity.id) && !remoteIds.has(activity.id),
          );
          this._activities.set(this.orderActivities([...activities, ...localActivities]));
          this._isLoadingActivities.set(false);
        },
        error: (error: Error) => {
          this._activityLoadError.set(error.message);
          this._isLoadingActivities.set(false);
        },
      });
  }

  private orderActivities(activities: TaskActivity[]): TaskActivity[] {
    return [...activities].sort((a, b) => {
      const aTime = Date.parse(a.createdAt);
      const bTime = Date.parse(b.createdAt);
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  }

  // ─── Private mutation pipelines ───────────────────────────────────────────

  /**
   * `exhaustMap` — ignores duplicate create triggers while a request is in-flight.
   * Reloads the task list from the server on success and records an activity.
   */
  private registerCreatePipeline(): void {
    this.createTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap((dto) =>
          this.api.createTask(dto).pipe(
            tap((created) => {
              const title = created?.title ?? dto.title;
              this.logActivity(
                ActivityAction.CREATED,
                created?.id ?? 'task-new',
                title,
                `Created task "${title}"`,
                created?.assignee?.name ?? dto.assignee?.name ?? 'John Doe',
              );
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._tasksResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * `exhaustMap` — ignores duplicate update triggers while a request is in-flight.
   * Reloads the task list and refreshes the selected-task detail on success.
   */
  private registerUpdatePipeline(): void {
    this.updateTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap(({ id, dto }) =>
          this.api.updateTask(id, dto).pipe(
            tap((updated) => {
              const title = updated?.title ?? dto.title;
              this.logActivity(
                ActivityAction.UPDATED,
                id,
                title,
                `Updated details for "${title}"`,
                updated?.assignee?.name ?? dto.assignee?.name ?? 'John Doe',
              );
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._tasksResource.reload();
          this._selectedTaskResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * `exhaustMap` — ignores duplicate patch triggers while a request is in-flight.
   * Reloads the task list and refreshes the selected-task detail on success.
   */
  private registerPatchPipeline(): void {
    this.patchTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap(({ id, dto }) =>
          this.api.patchTask(id, dto).pipe(
            tap((updated) => {
              const title = updated?.title ?? 'task';
              let action = ActivityAction.UPDATED;
              let desc = `Updated details for "${title}"`;

              if (dto.status) {
                action = ActivityAction.STATUS_CHANGED;
                const statusLabel =
                  dto.status === TaskStatus.DONE
                    ? 'Done'
                    : dto.status === TaskStatus.IN_PROGRESS
                      ? 'In Progress'
                      : 'To Do';
                desc = `Changed status to ${statusLabel} for "${title}"`;
              } else if (dto.assignee) {
                action = ActivityAction.ASSIGNED;
                desc = `Assigned "${title}" to ${dto.assignee.name}`;
              }

              this.logActivity(action, id, title, desc, updated?.assignee?.name ?? 'John Doe');
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._tasksResource.reload();
          this._selectedTaskResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * `exhaustMap` — ignores duplicate delete triggers while a request is in-flight.
   * Clears the selection if the deleted task was selected, records an activity, then reloads the list.
   */
  private registerDeletePipeline(): void {
    this.deleteTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap((id) => {
          const taskToDelete = this.tasks().find((t) => t.id === id);
          const title = taskToDelete?.title ?? 'task';

          return this.api.deleteTask(id).pipe(
            tap(() => {
              if (this._selectedTaskId() === id) {
                this._selectedTaskId.set(null);
              }
              this.logActivity(
                ActivityAction.DELETED,
                id,
                title,
                `Deleted task "${title}"`,
                'John Doe',
              );
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._tasksResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  private registerMoveTaskPipeline(): void {
    this.moveTask$
      .pipe(
        concatMap(({ id, status, previousStatus }) => {
          const task = this.tasks().find((item) => item.id === id);
          const version = this.moveVersions.get(id);
          if (!task) return EMPTY;

          return this.api.patchTask(id, { status }).pipe(
            tap((updated) => {
              const isLatestMove = this.moveVersions.get(id) === version;
              if (isLatestMove) {
                this.clearTaskStatusOverride(id);
                this._tasksResource.reload();
                this._selectedTaskResource.reload();
              }
              const title = updated?.title ?? task.title;
              const statusLabel =
                status === TaskStatus.DONE
                  ? 'Done'
                  : status === TaskStatus.IN_PROGRESS
                    ? 'In Progress'
                    : 'To Do';
              this.logActivity(
                ActivityAction.STATUS_CHANGED,
                id,
                title,
                `Changed status to ${statusLabel} for "${title}"`,
                updated?.assignee?.name ?? 'John Doe',
              );
            }),
            catchError((error: Error) => {
              if (this.moveVersions.get(id) === version) {
                this._taskStatusOverrides.update((current) => ({
                  ...current,
                  [id]: previousStatus,
                }));
              }
              this._mutationError.set(error.message);
              return EMPTY;
            }),
            finalize(() => {
              this.pendingMoves -= 1;
              this._isMutating.set(this.pendingMoves > 0);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  private clearTaskStatusOverride(id: string): void {
    this._taskStatusOverrides.update((current) =>
      Object.fromEntries(Object.entries(current).filter(([taskId]) => taskId !== id)),
    );
  }
}
