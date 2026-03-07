import type { Stage } from './stage-colors';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────────

export interface UserBasic {
  id: string;
  name: string;
  email?: string;
  avatar_url: string | null;
}

export interface StageHistoryEntry {
  stage: Stage;
  timestamp: string;
  actor_id: string;
  note?: string;
}

export interface BuildLogEntry {
  timestamp: string;
  content: string;
  source: string;
  build_health: 'on_track' | 'scope_growing' | 'blocked' | 'ahead_of_schedule';
}

export interface BriefContent {
  problem_statement: string;
  proposed_scope: string;
  ai_recommendation: 'build' | 'configure' | 'optimize' | 'no_action';
  effort_estimate: 'S' | 'M' | 'L' | 'XL';
  stack_recommendation: string[];
  overlaps_with: string[];
  open_questions: string[];
  confidence_score: number;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  stage: Stage;
  stack: string[];
  assigned_to: UserBasic | null;
  created_at: string;
  updated_at: string;
  team_id: string;
  created_by: string;
  archived: boolean;
  stage_history: StageHistoryEntry[];
  build_log: BuildLogEntry[];
  metadata: Record<string, unknown>;
  spark_content: string | null;
  brief: BriefContent | null;
  prd_id: string | null;
  effort_estimate: 'S' | 'M' | 'L' | 'XL' | null;
  has_conflicts?: boolean;
}

export interface ProjectListItem {
  id: string;
  title: string;
  description: string | null;
  stage: Stage;
  stack: string[];
  assigned_to: UserBasic | null;
  updated_at: string;
  effort_estimate: 'S' | 'M' | 'L' | 'XL' | null;
  has_conflicts?: boolean;
}

export interface ProjectCreate {
  title: string;
  spark_content?: string;
  description?: string;
}

export interface ProjectUpdate {
  title?: string;
  description?: string;
  assigned_to?: string;
  stack?: string[];
  effort_estimate?: 'S' | 'M' | 'L' | 'XL';
}

// ── Mock Data ────────────────────────────────────────────────────

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'AI Onboarding Tool',
    stage: 'in_build',
    description: 'Smart onboarding using Claude',
    stack: ['Next.js', 'FastAPI', 'Anthropic'],
    assigned_to: { id: 'user1', name: 'Achyuth', avatar_url: null },
    created_at: '2026-03-01',
    updated_at: '2026-03-05',
    team_id: 'team1',
    created_by: 'user1',
    archived: false,
    stage_history: [],
    build_log: [],
    metadata: {},
    spark_content: null,
    brief: null,
    prd_id: null,
    effort_estimate: 'L',
    has_conflicts: false,
  },
  {
    id: '2',
    title: 'Keystone PRD System',
    stage: 'review',
    description: 'Living PRD management',
    stack: ['LangGraph', 'Postgres'],
    assigned_to: { id: 'user2', name: 'Alex', avatar_url: null },
    created_at: '2026-02-28',
    updated_at: '2026-03-04',
    team_id: 'team1',
    created_by: 'user2',
    archived: false,
    stage_history: [],
    build_log: [],
    metadata: {},
    spark_content: null,
    brief: null,
    prd_id: null,
    effort_estimate: 'M',
    has_conflicts: false,
  },
  {
    id: '3',
    title: 'Wire Detection Pipeline',
    stage: 'brief',
    description: 'ML pipeline for electrical wire detection',
    stack: ['Python', 'PyTorch'],
    assigned_to: { id: 'user1', name: 'Achyuth', avatar_url: null },
    created_at: '2026-03-03',
    updated_at: '2026-03-06',
    team_id: 'team1',
    created_by: 'user1',
    archived: false,
    stage_history: [],
    build_log: [],
    metadata: {},
    spark_content: 'Detect wires in images',
    brief: null,
    prd_id: null,
    effort_estimate: 'XL',
    has_conflicts: false,
  },
  {
    id: '4',
    title: 'MCP Server Integration',
    stage: 'shipped',
    description: 'Internal MCP server for tool calls',
    stack: ['TypeScript', 'Node.js'],
    assigned_to: { id: 'user2', name: 'Alex', avatar_url: null },
    created_at: '2026-02-15',
    updated_at: '2026-02-25',
    team_id: 'team1',
    created_by: 'user2',
    archived: false,
    stage_history: [],
    build_log: [],
    metadata: {},
    spark_content: null,
    brief: null,
    prd_id: null,
    effort_estimate: 'S',
    has_conflicts: false,
  },
  {
    id: '5',
    title: 'Daily Brief Generator',
    stage: 'spark',
    description: 'AI-generated team standup summary',
    stack: [],
    assigned_to: null,
    created_at: '2026-03-06',
    updated_at: '2026-03-06',
    team_id: 'team1',
    created_by: 'user1',
    archived: false,
    stage_history: [],
    build_log: [],
    metadata: {},
    spark_content: 'Build a daily brief generator',
    brief: null,
    prd_id: null,
    effort_estimate: null,
    has_conflicts: false,
  },
];

// ── API Functions ────────────────────────────────────────────────
// Phase 1: All functions return mock data. Real API wired in Phase 2.

export async function getProjects(): Promise<Project[]> {
  // Phase 1: return mock data
  return Promise.resolve(MOCK_PROJECTS);
}

export async function getProject(id: string): Promise<Project | null> {
  const project = MOCK_PROJECTS.find(p => p.id === id);
  return Promise.resolve(project ?? null);
}

export async function createProject(data: ProjectCreate): Promise<Project> {
  const newProject: Project = {
    id: String(Date.now()),
    title: data.title,
    description: data.description ?? null,
    stage: 'spark',
    stack: [],
    assigned_to: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    team_id: 'team1',
    created_by: 'user1',
    archived: false,
    stage_history: [],
    build_log: [],
    metadata: {},
    spark_content: data.spark_content ?? null,
    brief: null,
    prd_id: null,
    effort_estimate: null,
    has_conflicts: false,
  };
  return Promise.resolve(newProject);
}

export async function updateProject(id: string, data: ProjectUpdate): Promise<Project> {
  const project = MOCK_PROJECTS.find(p => p.id === id);
  if (!project) throw new Error(`Project ${id} not found`);
  // Build a proper merged object respecting assigned_to type
  const merged: Project = {
    ...project,
    ...( data.title !== undefined ? { title: data.title } : {} ),
    ...( data.description !== undefined ? { description: data.description } : {} ),
    ...( data.stack !== undefined ? { stack: data.stack } : {} ),
    ...( data.effort_estimate !== undefined ? { effort_estimate: data.effort_estimate } : {} ),
    updated_at: new Date().toISOString(),
  };
  return Promise.resolve(merged);
}

export async function advanceProjectStage(
  id: string,
  targetStage: Stage,
  note?: string
): Promise<{ project: Project; approval_id?: string }> {
  const project = MOCK_PROJECTS.find(p => p.id === id);
  if (!project) throw new Error(`Project ${id} not found`);
  const updated = { ...project, stage: targetStage, updated_at: new Date().toISOString() };
  return Promise.resolve({ project: updated });
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BACKEND_URL}/api/v1${path}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}
