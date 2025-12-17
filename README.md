# wechat-agent - 智能微信智能体

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)

基于多模态大模型的微信自动化系统，实现"一句话完成复杂操作"的智能体验。

</div>

## ✨ 特性

### 🎯 多模态 AI 驱动

- **智能任务分析**：将自然语言指令自动分解为可执行步骤
- **视觉界面识别**：精准识别微信界面元素和状态
- **自适应执行**：根据界面变化动态调整操作策略

### � 智能任务编排

- **动态任务队列**：基于复杂指令（如"给张三发消息"）自动构建任务清单（TODO List），将大目标拆解为"查找联系人" -> "进入对话" -> "输入内容" -> "发送消息"等原子操作。
- **闭环状态反馈**：每一步操作后实时校验界面状态，确认执行成功后再推进下一步，确保任务链路的完整性。
- **自适应任务刷新**：根据执行过程中的意外弹窗或网络延迟，动态调整后续任务队列，具备极强的容错能力。

#### 📋 核心任务类型 (Atomic Tasks)

任务队列主要由以下三类基础任务动态组合而成：

1.  **👁️ 感知与决策 (Perception & Decision)**

    - **截图分析**：实时截取屏幕画面，提取关键信息。
    - **AI 决策**：调用大模型分析当前状态，判断任务进度，并生成下一步的 Action。

2.  **🖱️ 鼠标交互 (Mouse Interaction)**

    - **定位点击**：移动鼠标到指定坐标执行左键/右键点击。
    - **拖拽与滚动**：模拟人类的长按拖拽或滑轮滚动操作。

3.  **⌨️ 键盘输入 (Keyboard Input)**
    - **文本录入**：在激活的输入框中键入消息内容。
    - **快捷指令**：执行回车发送、复制粘贴等组合键操作。

### �🚀 强大的自动化能力

- **单次命令执行**：`npm run start "给张三发送消息你好"` 或者启动后支持 MCP API 调用
- **鼠标操作**：精确点击、输入、拖拽等
- **批量任务**：支持复杂的多步骤操作流程

### 💡 灵活的提示词系统

- **模块化模板**：提示词与代码分离，易于维护优化
- **变量替换**：支持动态参数和条件渲染

### 🛡️ 安全可靠

- **操作确认**：重要操作前可设置确认步骤
- **错误恢复**：完善的异常处理和重试机制
- **日志记录**：完整的操作日志和错误截图

## 🚀 快速开始

### 环境要求

- Node.js 18.0.0 或更高版本
- Windows 操作系统
- 微信客户端（需放置在屏幕左半部分）

### 技术选择

主要的技术选择包括：

- Node.js
- TypeScript
- RobotJS

```bash
npm install
```

### 多模态大模型按钮位置的处理

因为多模态大模型在识别截图中按钮的精确位置（X 和 Y 坐标）不准确， 所以采用固定窗口大小（850\*720）, 这样各个按钮的位置就是确定的：

- 主菜单

1. 微信消息按钮， (36,90)
2. 通讯录按钮， (36,140)
3. 收藏按钮， (36,190)
4. 朋友圈按钮， (36, 240)
5. 小程序按钮, (36, 290)
6. 手机按钮，(36, 625)
7. 更多按钮, (36, 675)

- 消息发送界面

1. 发送按钮, (770, 680)

### 配置

1. 复制配置文件模板：

```bash
cp config/config.zhipu.example.json config/config.json
```

2. 编辑 `config/config.json`，设置您的 API 密钥：

```json
{
  "api": {
    "apiKey": "your-zhipu-api-key",
    "model": "glm-4v"
  }
}
```

### 使用示例

1. 启动电脑版本的微信， 并登录
2. 将微信窗口拖动到屏幕的左半部分
3. 打开命令行， 进入项目目录， 运行 `npm run start "请给朋友圈的第1条动态点赞"`

#### 基础功能

```bash
# 分析微信界面状态
npm run start

# 使用自定义提示词分析
npm run start "请给朋友圈的第1条动态点赞"
```

## � MCP Protocol 集成

本项目完整支持 **Model Context Protocol (MCP)** 标准，可作为 Tool Server 无缝接入 Claude Desktop、Cursor 等现代 AI 工具链。

- **标准支持**: `send_message`, `get_unread_summary`, `view_moments` 等业务化工具。
- **配置指南**: 详细 API 定义请参考 [MCP API 文档](docs/MCP_API.md)。

配置示例 (Claude Desktop):

```json
{
  "mcpServers": {
    "wechat-agent": {
      "command": "node",
      "args": ["path/to/wechat-agent/dist/index.ts", "--mcp"] // 注意：开发环境使用 ts-node 或编译后的 js
    }
  }
}
```

## 📐 核心系统设计

为了确保自动化操作的稳定与安全，本系统采用了工业级的 Agent 设计架构：

### 1. 双层状态校验 (Dual-Loop Verification)

系统摒弃了脆弱的"盲操作"脚本模式，引入了视觉反馈闭环：

- **微观 UI 环**：每一次鼠标点击或键盘输入后，系统会自动截屏比对操作前后的界面差异（如按钮高亮变化、弹窗出现），未检测到预期变化会自动重试。
- **宏观 任务环**：在完成一系列动作后（如"发送消息"），系统会 OCR 识别聊天区，确认出现"发送成功"标识或新消息气泡，确保业务目标达成。

### 2. 安全围栏 (Safety Guardrails)

- **敏感操作拦截**：系统内置红线列表。涉及"转账"、"删除好友"、"清空记录"等高风险操作时，会自动挂起并弹窗请求人工二次确认。
- **紧急制动机制**：在运行过程中，一旦检测到用户**大幅度移动鼠标**或按下 `Ctrl+C`，Agent 会立即释放控制权并终止当前任务，确保人类拥有最高优先级。

### 3. 有限状态机 (UI State Machine)

系统内部维护着一个微信界面的状态图（Graph）。

- **上下文感知**：Agent 清楚自己当前是在"通讯录列表"还是"朋友圈详情页"。
- **非法路径阻断**：如果当前处于"朋友圈"，而任务是"发送消息"，系统会先规划路径导航回"聊天窗口"，而不是在当前页面胡乱点击。

## 📁 项目结构

```
wechat-agent/
├── src/                        # 源代码
│   ├── core/                    # 核心功能模块
│   ├── services/                # 服务层
│   ├── types/                   # TypeScript 类型定义
│   ├── utils/                   # 工具函数
│   └── index.ts                 # 主入口文件
├── prompts/                     # 提示词模板
├── config/                      # 配置文件
│   ├── config.example.json     # 配置模板
│   └── config.zhipu.example.json # 智谱 AI 配置模板
├── docs/                        # 文档
├── logs/                        # 日志文件
└── dist/                        # 编译输出
```

## 🔧 开发指南

### 开发模式

```bash
# 开发模式运行（支持热重载）
npm run dev

# 构建项目
npm run build

# 运行测试
npm run test

# 代码检查
npm run lint
```

### 添加新的提示词模板

1. 在 `prompts/` 目录下创建模板文件
2. 使用 Markdown 格式编写
3. 定义变量和示例
4. 在代码中引用

示例：

```text
# 自定义分析模板
分析目标: {{target}}
详细程度: {{detail}}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 规则
- 添加必要的注释和文档
- 编写单元测试

## 🐛 问题排查

### 常见问题

1. **截图失败**

   - 确保微信窗口在屏幕左半部分
   - 检查屏幕权限设置

2. **AI 分析失败**

   - 验证 API 密钥是否正确
   - 检查网络连接
   - 确认 API 配额充足

3. **任务执行失败**
   - 查看错误截图
   - 检查界面是否有变化
   - 调整任务间延迟时间

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [智谱 AI](https://zhipuai.cn/) - 提供强大的多模态大模型支持
- [RobotJS](https://robotjs.io/) - 提供跨平台的桌面自动化能力
- [Sharp](https://sharp.pixelplumbing.com/) - 高性能的图像处理库

## 📞 联系方式

- 作者：fugui
- GitHub：[@fugui](https://github.com/fugui)

---

<div align="center">

如果这个项目对您有帮助，请给个 ⭐ Star 支持一下！

</div>
