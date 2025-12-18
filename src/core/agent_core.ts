import { TaskManager } from "./task_manager";
import { TaskPlanner } from "./task_planner";
import { ScreenCapturer } from "./screen_capturer";
import { RobotService } from "./robot_service";
import { AIClient } from "./ai_client";
import { TaskStep } from "../types/task";
import { UI_CONSTANTS } from "../config/ui_constants";

const fs = require("fs");
const path = require("path");

export class AgentCore {
  private taskManager: TaskManager;
  private planner: TaskPlanner;
  private capturer: ScreenCapturer;
  private aiClient: AIClient;
  private robot: RobotService;

  constructor(config: any) {
    this.aiClient = new AIClient(config.api);
    this.taskManager = new TaskManager();
    this.planner = new TaskPlanner(this.aiClient);
    this.capturer = new ScreenCapturer();
    this.robot = RobotService.getInstance();
  }

  private loadPrompt(
    filename: string,
    replacements: Record<string, string> = {}
  ): string {
    try {
      const filePath = path.join(__dirname, "../prompts", filename);
      let content = fs.readFileSync(filePath, "utf-8");
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
      }
      return content;
    } catch (e) {
      console.error(`Failed to load prompt ${filename}:`, e);
      return "";
    }
  }

  public async start(instruction: string) {
    console.log(`🚀 Agent starting with instruction: "${instruction}"`);

    try {
      // 1. Create Initial Task (Self-Expanding via a 'plan' step)
      const initialSteps = [
        {
          type: "plan",
          description: `生成初步计划: ${instruction}`,
          params: { instruction },
        },
      ];
      const task = this.taskManager.createTask(instruction, initialSteps);
      console.log(`📝 Task initialized with Goal: "${instruction}"`);

      // 2. Main Orchestration Loop
      // The task manager will be dynamically updated as steps are executed.
      while (!this.taskManager.isTaskComplete()) {
        const step = this.taskManager.getCurrentStep();
        if (!step) break;

        const stepNum = task.currentStepIndex + 1;
        const totalSteps = task.steps.length;
        console.log(
          `\n▶ [Step ${stepNum}/${totalSteps}] Executing: ${step.type}`
        );
        console.log(`   Desc: ${step.description}`);
        if (step.params && Object.keys(step.params).length > 0) {
          console.log(`   Params:`, step.params);
        }

        // Capture state (Context)
        await this.capturer.adjustWindow();

        // Execute step
        try {
          await this.executeStep(step);

          // Success: Mark complete and advance to next (possibly new) step
          console.log("   ✅ Step success");
          this.taskManager.completeCurrentStep(true);
        } catch (e: any) {
          console.error("   ❌ Step failed:", e.message || e);
          this.taskManager.completeCurrentStep(false, e);
          break; // Usually stop on failure in a multi-step task
        }

        // Small delay between steps to allow UI to breathe
        await new Promise((resolve) =>
          setTimeout(resolve, UI_CONSTANTS.DELAY_STEP)
        );
      }

      const finalTask = this.taskManager.getCurrentTask();
      console.log(`\n🏁 Task finished with status: ${finalTask?.status}`);
      if (finalTask?.status === "completed") {
        console.log("🎉 All steps executed successfully.");
      }
    } catch (error) {
      console.error("💥 Agent Start Error:", error);
    }
  }

  private async executeStep(step: TaskStep) {
    switch (step.type) {
      case "search_contact":
        await this.handleSearchContact(step);
        break;

      case "enter_chat":
        await this.handleEnterChat();
        break;

      case "type_text":
        await this.handleTypeText(step);
        break;

      case "click_send":
        await this.handleClickSend();
        break;

      case "navigate_to":
        await this.handleNavigateTo(step);
        break;

      case "browse_moments":
        await this.handleBrowseMoments(step);
        break;

      case "check_new_messages":
        await this.handleCheckNewMessages(step);
        break;

      case "check_sent_messages":
        await this.handleCheckSentMessages();
        break;

      case "get_contact_chat_records":
        await this.handleGetContactChatRecords();
        break;

      case "plan":
        await this.handlePlan(step);
        break;

      case "analyze":
        await this.handleAnalyze(step);
        break;

      default:
        console.warn("Unknown step type:", step.type);
        // Fallback
        if (step.type === "tap" && step.params?.x && step.params?.y) {
          await this.robot.tap(step.params.x, step.params.y);
        }
    }
  }

  private async handleCheckSentMessages() {
    console.log("   👀 Verifying sent message...");
    const chatImg = await this.capturer.captureLeftScreen();
    const verifyPrompt = this.loadPrompt("verify_sent.md");
    const result = await this.aiClient.analyzeImage(chatImg, "", verifyPrompt);
    console.log("      ✅ Sent Status:", JSON.stringify(result));
  }

  private async handleSearchContact(step: TaskStep) {
    // 1. Click search bar
    await this.robot.tap(UI_CONSTANTS.SEARCH_BAR.x, UI_CONSTANTS.SEARCH_BAR.y);
    // 2. Input name
    if (step.params?.name) {
      await this.robot.input(step.params.name);
    }
    // 3. Wait for search results
    await new Promise((r) => setTimeout(r, UI_CONSTANTS.DELAY_SEARCH));

    // 4. Verification
    console.log("   🔍 Verifying search results...");
    const searchImage = await this.capturer.captureLeftScreen();
    const verifyInstruction = this.loadPrompt("verify_search.md", {
      name: step.params?.name || "",
    });

    const verifyResult = await this.aiClient.analyzeImage(
      searchImage,
      "",
      verifyInstruction
    );

    if (verifyResult) {
      console.log("   🤔 AI sees:", JSON.stringify(verifyResult));
    }
  }

  private async handleEnterChat() {
    await this.robot.tap(
      UI_CONSTANTS.SEARCH_RESULT_FIRST.x,
      UI_CONSTANTS.SEARCH_RESULT_FIRST.y
    );
  }

  private async handleTypeText(step: TaskStep) {
    await this.robot.tap(
      UI_CONSTANTS.CHAT_INPUT_AREA.x,
      UI_CONSTANTS.CHAT_INPUT_AREA.y
    );
    if (step.params?.content) await this.robot.input(step.params.content);
  }

  private async handleClickSend() {
    await this.robot.tap(
      UI_CONSTANTS.SEND_BUTTON.x,
      UI_CONSTANTS.SEND_BUTTON.y
    );
  }

  private async handleNavigateTo(step: TaskStep) {
    const map: Record<string, { x: number; y: number }> = {
      chat: UI_CONSTANTS.NAV_CHAT,
      contacts: UI_CONSTANTS.NAV_CONTACTS,
      moments: UI_CONSTANTS.NAV_MOMENTS,
      favorites: UI_CONSTANTS.NAV_FAVORITES,
    };
    const target = step.params?.target as string;
    if (target && map[target]) {
      const coords = map[target];
      await this.robot.tap(coords.x, coords.y);
    } else {
      console.warn(`Unknown navigation target: ${target}`);
    }
  }

  private async handleBrowseMoments(step: TaskStep) {
    const browseCount = step.params?.count || 3;
    console.log(`   👀 Browsing moments (Count: ${browseCount})...`);

    for (let i = 0; i < browseCount; i++) {
      console.log(`   🔄 Feed Item ${i + 1}/${browseCount}`);

      // 1. Capture & Analyze
      const feedImg = await this.capturer.captureLeftScreen();
      const feedAnalysisPrompt = this.loadPrompt("analyze_feed.md");

      const feedAnalysis = await this.aiClient.analyzeImage(
        feedImg,
        "",
        feedAnalysisPrompt
      );

      console.log("      🧠 Feed Analysis:", JSON.stringify(feedAnalysis));

      await new Promise((r) => setTimeout(r, 1000));

      // 3. Scroll Down
      await this.robot.scroll("down", 1000); // Scroll a bit
      await new Promise((r) => setTimeout(r, 2000)); // Wait for render
    }
  }

  private async handleCheckNewMessages(step: TaskStep) {
    const limit = step.params?.limit || 5;
    console.log(`   📧 Checking for new messages (Limit: ${limit})...`);

    const listImg = await this.capturer.captureLeftScreen();
    const findUnreadPrompt = this.loadPrompt("find_unread.md");
    const unreadResult = await this.aiClient.analyzeImage(
      listImg,
      "",
      findUnreadPrompt
    );

    console.log("      🔍 Unread Analysis:", JSON.stringify(unreadResult));

    const unreadChats = unreadResult.unreadChats || [];
    if (unreadChats.length === 0) {
      console.log("      ✅ No unread messages found.");
      return;
    }

    let processed = 0;
    for (const chat of unreadChats) {
      if (processed >= limit) break;

      console.log(
        `      📩 Reading chat: ${chat.name} at (${chat.x}, ${chat.y})`
      );

      await this.robot.tap(chat.x, chat.y);
      await new Promise((r) => setTimeout(r, 1500));

      const chatContentImg = await this.capturer.captureLeftScreen();
      const extractPrompt = this.loadPrompt("extract_chat.md");
      const chatContent = await this.aiClient.analyzeImage(
        chatContentImg,
        "",
        extractPrompt
      );

      console.log(`      📝 Content from ${chat.name}:`);
      console.log(JSON.stringify(chatContent, null, 2));

      processed++;
    }
  }

  private async handleGetContactChatRecords() {
    console.log("   📜 Analyzing chat records...");
    const chatImg = await this.capturer.captureLeftScreen();

    const chatRecordInstruction = this.loadPrompt("extract_chat.md");

    const recordAnalysis = await this.aiClient.analyzeImage(
      chatImg,
      "",
      chatRecordInstruction
    );
    console.log(
      "      📄 Extracted Records:",
      JSON.stringify(recordAnalysis, null, 2)
    );
  }

  private async handlePlan(step: TaskStep) {
    const instruction = step.params?.instruction || step.description;
    console.log(`   🧠 Planning sub-steps for: "${instruction}"...`);

    // Call the text-based planner
    const subSteps = await this.planner.plan(instruction);

    if (subSteps && subSteps.length > 0) {
      console.log(`      ➕ Inserting ${subSteps.length} planned steps.`);
      this.taskManager.insertNextSteps(subSteps);
    } else {
      console.log("      ⚠️ No steps generated for this plan.");
    }
  }

  private async handleAnalyze(step: TaskStep) {
    const instruction = step.params?.instruction || step.description;
    console.log(`   🧠 Analyzing screen with instruction: "${instruction}"...`);

    const screenshot = await this.capturer.captureLeftScreen();
    const result = await this.aiClient.analyzeImage(screenshot, instruction);

    console.log("   🤔 AI Analysis Result:");
    console.log(JSON.stringify(result, null, 2));

    // If the vision analysis suggests concrete steps (action_suggestion), insert them!
    if (result.action_suggestion && result.action_suggestion.steps) {
      const nextSteps = result.action_suggestion.steps
        .filter((s: any) => s.action && s.action !== "END")
        .map((s: any) => ({
          type: s.action,
          params: s,
          description: s.description || ` visión suggested ${s.action}`,
        }));

      if (nextSteps.length > 0) {
        console.log(
          `      ➕ Adding ${nextSteps.length} vision-suggested steps to the task.`
        );
        this.taskManager.insertNextSteps(nextSteps);
      }
    }
  }
}
