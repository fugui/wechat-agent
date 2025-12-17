import { AIClient } from "./ai_client";
import { TaskStep } from "../types/task";

export class TaskPlanner {
  constructor(private aiClient: AIClient) {}

  public async plan(goal: string): Promise<Omit<TaskStep, "id" | "status">[]> {
    console.log(`🧠 Planning task for: "${goal}"...`);
    const result = await this.aiClient.planTask(goal);

    if (!result.steps || !Array.isArray(result.steps)) {
      throw new Error("Invalid plan format from AI: " + JSON.stringify(result));
    }

    return result.steps as Omit<TaskStep, "id" | "status">[];
  }
}
