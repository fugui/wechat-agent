import { ScreenCapturer } from "./core/screen_capturer";
import { AIClient } from "./core/ai_client";
import { RobotService } from "./core/robot_service";
import fs from "fs";
import path from "path";

// 读取配置
// 简单的配置文件读取逻辑，实际项目中可能用 dotenv 或 conf 库
function loadConfig() {
  const configPath = path.join(__dirname, "../config/config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("Config file not found at " + configPath);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

import { AgentCore } from "./core/agent_core";

// ... existing imports ...

async function main() {
  try {
    console.log("🚀 WeChat Agent Phase 3 Starting...");

    // 1. 初始化
    const config = loadConfig();
    if (!config.api || !config.api.apiKey) {
      throw new Error("API Key missing in config");
    }

    // Initialize Agent Core
    const agent = new AgentCore(config);

    // 2. Start Agent with Instruction
    // 2. Start Agent with Instruction
    const testInstruction = process.argv[2] || "获取全部联系人信息";

    await agent.start(testInstruction);
  } catch (error) {
    console.error("❌ Agent failed:", error);
  }
}

main();
