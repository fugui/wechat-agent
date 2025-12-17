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
      // 1. Plan
      console.log("WAITING for Plan...");
      const steps = await this.planner.plan(instruction);
      const task = this.taskManager.createTask(instruction, steps);
      console.log(`📝 Plan created with ${steps.length} steps.`);
      console.log(JSON.stringify(steps, null, 2));

      // 2. Loop
      while (!this.taskManager.isTaskComplete()) {
        const step = this.taskManager.getCurrentStep();
        if (!step) break;

        console.log(
          `\n▶ [Step ${task.currentStepIndex + 1}/${
            task.steps.length
          }] Executing: ${step.type}`
        );
        console.log(`   Desc: ${step.description}`);
        console.log(`   Params:`, step.params);

        // Capture state (Context)
        // Ideally we check if we are on the right screen, but for Phase 3 simple loop, we just adjust window
        await this.capturer.adjustWindow();

        // Execute
        try {
          await this.executeStep(step);

          // Verification (Optional for now, but simple delay helps)
          console.log("   ✅ Step success");
          this.taskManager.completeCurrentStep(true);
        } catch (e) {
          console.error("   ❌ Step failed:", e);
          this.taskManager.completeCurrentStep(false, e);
          break; // Stop on failure
        }

        // Delay between steps
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const finalStatus = this.taskManager.getCurrentTask()?.status;
      console.log(`🏁 Task finished with status: ${finalStatus}`);
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
    await this.robot.tap(770, 680);
  }

  private async handleNavigateTo(step: TaskStep) {
    const map: Record<string, [number, number]> = {
      chat: [36, 90],
      contacts: [36, 140],
      moments: [36, 240],
    };
    const target = step.params?.target as string;
    if (target && map[target]) {
      const coords = map[target];
      await this.robot.tap(coords[0], coords[1]);
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
}
