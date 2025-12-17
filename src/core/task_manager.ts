import { Task, TaskStep } from "../types/task";
import { v4 as uuidv4 } from "uuid";

export class TaskManager {
  private currentTask: Task | null = null;

  /**
   * Create a new task and set it as absolute current
   */
  public createTask(
    goal: string,
    rawSteps: Omit<TaskStep, "id" | "status">[]
  ): Task {
    const steps: TaskStep[] = rawSteps.map((s) => ({
      ...s,
      id: uuidv4(),
      status: "pending",
    }));

    const task: Task = {
      id: uuidv4(),
      goal,
      steps,
      currentStepIndex: 0,
      status: "pending",
      createdAt: Date.now(),
    };

    this.currentTask = task;
    return task;
  }

  public getCurrentTask(): Task | null {
    return this.currentTask;
  }

  public getCurrentStep(): TaskStep | null {
    if (!this.currentTask) return null;
    const idx = this.currentTask.currentStepIndex;
    if (idx < 0 || idx >= this.currentTask.steps.length) return null;
    return this.currentTask.steps[idx];
  }

  /**
   * Mark current step complete and advance
   */
  public completeCurrentStep(success: boolean = true, result?: any) {
    if (!this.currentTask) return;

    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    currentStep.status = success ? "completed" : "failed";
    currentStep.result = result;

    if (success) {
      this.currentTask.currentStepIndex++;
      if (this.currentTask.currentStepIndex >= this.currentTask.steps.length) {
        this.currentTask.status = "completed";
      } else {
        this.currentTask.status = "running";
      }
    } else {
      this.currentTask.status = "failed";
    }
  }

  public isTaskComplete(): boolean {
    if (!this.currentTask) return true; // No task = nothing to do
    return (
      this.currentTask.status === "completed" ||
      this.currentTask.status === "failed"
    );
  }
}
