export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface TaskStep {
  id: string;
  type: string; // e.g., 'search_contact', 'send_message', 'tap', 'input'
  description: string;
  params?: Record<string, any>; // Flexible params like { name: 'Zhang San' } or { x: 100, y: 200 }
  status: TaskStatus;
  result?: any;
}

export interface Task {
  id: string;
  goal: string; // Original user instruction
  steps: TaskStep[];
  currentStepIndex: number;
  status: TaskStatus;
  createdAt: number;
}
