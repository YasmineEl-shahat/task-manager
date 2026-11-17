import { Assignee } from '@tasks/models/task.model';

export interface TeamMember extends Assignee {
  role: string;
}
