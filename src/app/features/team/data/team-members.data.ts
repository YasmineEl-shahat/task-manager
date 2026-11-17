import { TeamMember } from '@features/team/models/team-member.model';

export const TEAM_MEMBERS: readonly TeamMember[] = [
  {
    id: 'user-001',
    name: 'John Doe',
    avatar: 'JD',
    email: 'john.doe@company.com',
    role: 'Product Designer',
  },
  {
    id: 'user-002',
    name: 'Sarah Smith',
    avatar: 'SS',
    email: 'sarah.smith@company.com',
    role: 'Frontend Developer',
  },
  {
    id: 'user-003',
    name: 'Mike Johnson',
    avatar: 'MJ',
    email: 'mike.johnson@company.com',
    role: 'Backend Developer',
  },
  {
    id: 'user-004',
    name: 'Emily Davis',
    avatar: 'ED',
    email: 'emily.davis@company.com',
    role: 'QA Engineer',
  },
];
