import { ZhipuAI } from "zhipuai";
import fs from "fs";
import path from "path";

export interface AIAnalysisResult {
  description: string;
  uiState?: string; // e.g., 'chat_list', 'chat_window', 'moments'
  action_suggestion?: any;
}

export class AIClient {
  private client: ZhipuAI;
  private model: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.client = new ZhipuAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      fetch: globalThis.fetch as any, // Explicitly pass global fetch
    });
    this.model = config.model || "glm-4v"; // 优先使用配置的模型，默认为 glm-4v
  }

  /**
   * 分析屏幕截图
   * @param imageBuffer 图片 Buffer
   * @param instruction 用户指令或上下文
   * @param customSystemPrompt (Optional) 自定义系统提示词，覆盖默认的 system_prompt.md
   */
  public async analyzeImage(
    imageBuffer: Buffer,
    instruction: string,
    customSystemPrompt?: string
  ): Promise<any> {
    const base64Image = imageBuffer.toString("base64");

    let prompt = "";

    if (customSystemPrompt) {
      prompt = customSystemPrompt.replace("${instruction}", instruction);
    } else {
      // 读取 Prompt 模板
      const promptPath = path.join(__dirname, "../prompts/system_prompt.md");
      let promptTemplate = "";
      try {
        promptTemplate = fs.readFileSync(promptPath, "utf-8");
      } catch (e) {
        console.error("Failed to load prompt template, using fallback:", e);
        promptTemplate = `你是一个智能微信自动化助手。请分析这张微信界面的截图。
    用户的指令是: "\${instruction}"
    
    请仔细观察界面，并以 JSON 格式返回分析结果。
    请确保只返回纯 JSON 字符串，不要包含 markdown 标记。`;
      }
      prompt = promptTemplate.replace("${instruction}", instruction);
    }

    // 构建 Prompt
    // 我们可以根据 instruction 动态调整 system prompt
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: base64Image,
            },
          },
        ],
      },
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any, // SDK 类型定义可能有差异，强制转换
      });

      const content = response.choices[0]?.message?.content || "{}";
      // 简单的清洗 json 块
      const cleanJson = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        return JSON.parse(cleanJson);
      } catch (error) {
        console.error(
          "JSON parse failed:",
          response.choices[0]?.message?.content
        );
        throw error;
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      throw error;
    }
  }

  /**
   * 规划任务
   * @param instruction 用户指令
   */
  public async planTask(instruction: string): Promise<any> {
    const promptPath = path.join(__dirname, "../prompts/planning.md");
    let promptTemplate = "";
    try {
      promptTemplate = fs.readFileSync(promptPath, "utf-8");
    } catch (e) {
      console.error("Failed to load planning prompt:", e);
      throw e;
    }

    const messages = [
      {
        role: "system",
        content: promptTemplate,
      },
      {
        role: "user",
        content: instruction,
      },
    ];

    try {
      const response = await this.client.chat.completions.create({
        // However, the user config might only supply one model.
        // Let's us this.model for now to correspond with config,
        // but usually a pure language model is better for planning.
        // If this.model is 'glm-4v', it handles text too.
        model: this.model,
        messages: messages as any,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleanJson = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        return JSON.parse(cleanJson);
      } catch (error) {
        console.error("JSON parse failed for plan:", content);
        throw error;
      }
    } catch (error) {
      console.error("AI Planning failed:", error);
      throw error;
    }
  }
}
