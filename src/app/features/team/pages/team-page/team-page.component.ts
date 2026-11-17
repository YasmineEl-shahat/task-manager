import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { TeamMember } from '@features/team/models/team-member.model';
import { TEAM_MEMBERS } from '@features/team/data/team-members.data';
import { TaskStatus } from '@tasks/models/task.enums';
import { TaskStore } from '@tasks/store/task.store';

interface TeamMemberSummary extends TeamMember {
  readonly assignedTasks: number;
  readonly openTasks: number;
  readonly completedTasks: number;
}

@Component({
  selector: 'app-team-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './team-page.component.html',
  styleUrl: './team-page.component.scss',
})
export class TeamPageComponent {
  private readonly store = inject(TaskStore);
  private readonly dialog = inject(MatDialog);

  readonly searchQuery = signal('');

  readonly members = computed<readonly TeamMemberSummary[]>(() =>
    TEAM_MEMBERS.map((member) => {
      const assigned = this.store.tasks().filter((task) => task.assignee?.id === member.id);
      const completedTasks = assigned.filter((task) => task.status === TaskStatus.DONE).length;

      return {
        ...member,
        assignedTasks: assigned.length,
        openTasks: assigned.length - completedTasks,
        completedTasks,
      };
    }),
  );

  readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.members();

    return this.members().filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query),
    );
  });

  readonly totalMembers = TEAM_MEMBERS.length;

  onSearchChange(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchQuery.set(event.target.value);
    }
  }

  async assignTask(member: TeamMember): Promise<void> {
    const { TaskFormComponent } = await import('@tasks/components/task-form/task-form.component');
    this.dialog.open(TaskFormComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { assigneeId: member.id },
    });
  }
}
