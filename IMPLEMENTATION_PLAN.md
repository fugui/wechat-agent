# wechat-agent Implementation Plan (Step-by-Step)

本文档规划了从零构建 `wechat-agent` 的详细实施步骤。我们将采用"感知 -> 决策 -> 执行"的分层架构，并最终以 MCP Server 的形式对外暴露服务。

## Phase 1: 基础设施与感知层 (Foundation & Perception)

**目标**: 搭建项目骨架，实现对微信窗口的"看"（截图）和环境配置。

- [x] **Step 1.1: 项目初始化**
  - 创建 TypeScript + Node.js 项目结构。
  - 配置 ESLint, Prettier, tsconfig.json。
  - 安装核心依赖: `robotjs` (控制), `sharp` (图像处理), `zhipuai` (大模型 SDK)。
- [x] **Step 1.2: 屏幕捕获模块 (ScreenCapture)**
  - 实现 `ScreenCapturer` 类：支持指定区域截图。
  - 实现"窗口定位"逻辑：通过固定坐标或图像匹配找到微信窗口的左上角 (假设用户已将微信置于左侧)。
  - 测试：能成功截取到微信主界面的清晰图片并保存。
- [x] **Step 1.3: 多模态 AI 接入 (AI Client)**
  - 封装 `AIClient` 类：对接智谱 GLM-4v API。
  - 实现 `analyzeImage(imageBuffer, prompt)` 方法：发送截图给 AI 并获取结构化分析结果。
  - 验证：发送微信截图，让 AI 识别出"当前在聊天列表"或"当前在朋友圈"。

## Phase 2: 核心原子操作层 (Core Action Layer)

**目标**: 实现"手"的能力，让代码能控制鼠标键盘。

- [x] **Step 2.1: 基础输入控制 (InputController)**
  - 封装 `RobotService`：统一管理 `tap`, `scroll`, `input`, `pressKey`。
  - 实现坐标转换：将 AI 返回的相对坐标 (0-1000) 转换为屏幕绝对坐标。
  - 实现安全制动：在操作前检查鼠标位置，如果用户大幅移动鼠标则抛出异常停止执行。
- [x] **Step 2.2: 剪贴板与输入法兼容 (Clipboard & IME)**
  - 解决 `robotjs` 输入中文困难的问题：实现"复制到剪贴板 -> 模拟 Ctrl+V" 的输入策略。
  - 封装 `pasteText(text)` 方法。

## Phase 3: 任务编排与状态机 (Orchestration & State Machine)

**目标**: 实现"脑"的能力，将原子操作串联成有意义的任务。

- [x] **Step 3.1: 任务队列管理器 (TaskManager)**
  - 定义 `Task` 和 `TaskStep` 接口。
  - 实现简单的队列：支持 `addTask`, `nextStep`。
- [x] **Step 3.2: 状态与规划器 (Planner)**
  - 设计 Prompt Template：`prompts/planning.md`，教 AI 如何将 "给张三发你好" 拆解为 `[search_contact, enter_chat, type_text, send]`。
  - 实现 `TaskPlanner`：接收用户指令 -> 调用 AI -> 生成任务 JSON -> 压入队列。
- [x] **Step 3.3: 执行循环 (Execution Loop)**
  - 实现主循环：
    1. 取出当前 Step。
    2. **截图**检查当前状态。
    3. 执行 Step 对应的原子操作（如点击）。
    4. 再次**截图**验证操作反馈 (Verify)。

## Phase 4: 业务场景深耕 (Business Features Refinement)

**目标**: 基于 Agent Core 实现高鲁棒性的业务功能，重点解决复杂场景下的稳定性。

- [x] **Step 4.1: 高级消息发送 (Robust Messaging)**
  - 现状：基础的"搜索->进入->发送"链路已通。
  - 改进：增加**搜索结果校验**。截图分析搜索列表，确保点击的是正确的联系人（防止同名或搜索失败）。
  - 实现：集成到 `AgentCore` 的 `executeStep` 中，在 `search_contact` 后增加了隐式的 `analyze` 确认（目前仅记录日志，后续可增加阻断逻辑）。
- [x] **Step 4.2: 闭环视觉任务决策 (Closed-loop Visual Planning)**
  - 架构合并：将 `plan` (纯文本) 与 `analyze` (视觉) 合并为单一的“智能感知”层。
  - 实现：每一轮任务决策都包含截图分析，根据当前屏幕状态动态生成或插入子步骤。
  - **Feed 流分析**：已实现 `browse_moments` 动作，支持"滚动 -> 截图 -> AI 分析 -> 滚动"的循环。
  - 互动：让 AI 识别每条动态的"点赞/评论"按钮位置（通常是动态的），并生成点击指令（基础框架已就绪）。
- [x] **Step 4.3: 消息读取与摘要 (Reading & Summary)**
  - 列表识别：实现 `find_unread.md` 提示词，让 AI 识别左侧列表中的"红点"或数字气泡并返回坐标。
  - 自动提取：实现 `check_new_messages` 动作，自动循环点击未读会话 -> 截图提取内容 -> 输出结构化记录。
  - 输出：控制台实时输出每个未读会话的最近消息摘要。

## Phase 5: MCP Server 集成 (MCP Integration)

**目标**: 将 Agent 包装为标准 MCP 服务，接入 Claude/Cursor 生态。

- [ ] **Step 5.1: MCP 服务架构搭建**
  - 安装 `@modelcontextprotocol/sdk`。
  - 创建 `src/mcp_server.ts`，初始化 MCP Server 实例。
  - 设计 Tool Schema：
    - `send_message(contact: string, content: string)`
    - `check_moments(count: number)`
    - `get_unread_summary()`
- [ ] **Step 5.2: AgentCore 适配**
  - 将 `AgentCore` 改造为单例服务，确保同一时间只能执行一个 MCP 请求（避免鼠标冲突）。
  - 实现 Prompt 转发：MCP 的请求参数 -> `AgentCore.start(instruction)`。
- [ ] **Step 5.3: 本地调试与部署**
  - 配置 Claude Desktop 的 `claude_desktop_config.json` 指向本地服务。
  - 进行端到端测试：在 Claude 中直接对话控制微信。

## Phase 6: 优化与维护 (Optimization & Maintenance)

- [ ] **性能优化**: 减少不必要的 `wait` 时间，优化截图体积。
- [ ] **本地日志**: 完善 `logs/` 目录，记录每次 AI 的决策快照，便于调试。
- [ ] **文档完善**: 更新 README 和 MCP 接入指南。
