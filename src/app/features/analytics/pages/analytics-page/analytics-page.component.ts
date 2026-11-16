import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { TaskStore } from '@tasks/store/task.store';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';

export interface ChartSegment {
  readonly label: string;
  readonly value: number;
  readonly percentage: number;
  readonly color: string;
  readonly offset: number;
}

export interface BarEntry {
  readonly label: string;
  readonly value: number;
  readonly percentage: number;
  readonly color: string;
}

export interface AnalyticsSummaryCard {
  readonly label: string;
  readonly value: number;
  readonly icon: string;
  readonly color: string;
  readonly bgColor: string;
}

/** Circumference of the donut SVG circle (r=54) */
const CIRCUMFERENCE = 2 * Math.PI * 54;

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.scss',
})
export class AnalyticsPageComponent {
  readonly store = inject(TaskStore);

  readonly CIRCUMFERENCE = CIRCUMFERENCE;

  // ─── Derived analytics ────────────────────────────────────────────────────

  readonly allTasks = computed<readonly Task[]>(() => this.store.tasks());

  readonly summaryCards = computed<readonly AnalyticsSummaryCard[]>(() => {
    const tasks = this.allTasks();
    const now = new Date();
    const overdue = tasks.filter((t) => {
      if (t.status === TaskStatus.DONE) return false;
      if (t.isOverdue !== undefined) return t.isOverdue;
      const due = new Date(`${t.dueDate}T00:00:00`);
      return !Number.isNaN(due.getTime()) && due < now;
    }).length;
    const completionRate =
      tasks.length > 0
        ? Math.round((tasks.filter((t) => t.status === TaskStatus.DONE).length / tasks.length) * 100)
        : 0;
    return [
      { label: 'Total Tasks', value: tasks.length, icon: 'assignment', color: '#1976d2', bgColor: '#e3f2fd' },
      { label: 'Completed', value: tasks.filter((t) => t.status === TaskStatus.DONE).length, icon: 'check_circle', color: '#388e3c', bgColor: '#e8f5e9' },
      { label: 'Overdue', value: overdue, icon: 'warning', color: '#d32f2f', bgColor: '#ffebee' },
      { label: 'Completion Rate', value: completionRate, icon: 'trending_up', color: '#f57c00', bgColor: '#fff3e0' },
    ];
  });

  // ─── Status Donut Chart ───────────────────────────────────────────────────

  readonly statusSegments = computed<readonly ChartSegment[]>(() => {
    const tasks = this.allTasks();
    const total = tasks.length || 1;
    const counts = [
      { label: 'To Do', value: tasks.filter((t) => t.status === TaskStatus.TODO).length, color: '#78909c' },
      { label: 'In Progress', value: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length, color: '#1976d2' },
      { label: 'Done', value: tasks.filter((t) => t.status === TaskStatus.DONE).length, color: '#388e3c' },
    ];
    let offset = 0;
    return counts.map((s) => {
      const percentage = s.value / total;
      const seg: ChartSegment = { ...s, percentage, offset };
      offset += percentage * CIRCUMFERENCE;
      return seg;
    });
  });

  // ─── Priority Donut Chart ─────────────────────────────────────────────────

  readonly prioritySegments = computed<readonly ChartSegment[]>(() => {
    const tasks = this.allTasks();
    const total = tasks.length || 1;
    const counts = [
      { label: 'High', value: tasks.filter((t) => t.priority === TaskPriority.HIGH).length, color: '#d32f2f' },
      { label: 'Medium', value: tasks.filter((t) => t.priority === TaskPriority.MEDIUM).length, color: '#f57c00' },
      { label: 'Low', value: tasks.filter((t) => t.priority === TaskPriority.LOW).length, color: '#388e3c' },
    ];
    let offset = 0;
    return counts.map((s) => {
      const percentage = s.value / total;
      const seg: ChartSegment = { ...s, percentage, offset };
      offset += percentage * CIRCUMFERENCE;
      return seg;
    });
  });

  // ─── Horizontal bar chart: tasks by assignee ──────────────────────────────

  readonly assigneeBarEntries = computed<readonly BarEntry[]>(() => {
    const tasks = this.allTasks();
    const map = new Map<string, number>();
    for (const t of tasks) {
      const name = t.assignee?.name ?? 'Unknown';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    const max = Math.max(...Array.from(map.values()), 1);
    const palette = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#00838f'];
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({
        label,
        value,
        percentage: value / max,
        color: palette[i % palette.length]!,
      }));
  });

  // ─── Vertical bar chart: tasks completed per day (last 7 days) ───────────

  readonly weeklyBarEntries = computed<readonly BarEntry[]>(() => {
    const tasks = this.allTasks();
    const days: BarEntry[] = [];
    const max = { count: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const rawCounts: { label: string; value: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = dayNames[d.getDay()]!;
      const count = tasks.filter((t) => {
        if (t.status !== TaskStatus.DONE) return false;
        const completed = t.completedAt ?? t.updatedAt;
        return completed?.slice(0, 10) === dateStr;
      }).length;
      if (count > max.count) max.count = count;
      rawCounts.push({ label, value: count });
    }

    const maxVal = Math.max(max.count, 1);
    const palette = ['#1976d2'];
    for (const { label, value } of rawCounts) {
      days.push({ label, value, percentage: value / maxVal, color: palette[0]! });
    }
    return days;
  });
}
