# wechat-agent MCP Server API Definition

本文档定义了 **wechat-agent** 系统暴露给 Model Context Protocol (MCP) 的接口标准。通过这些业务化的接口，其他 AI Agent 可以直接调用本系统完成具体的微信操作，而无需关心底层的自动化细节。

## 🚀 Server Configuration

在 MCP 客户端配置中添加本服务：

```json
{
  "mcpServers": {
    "wechat-agent": {
      "command": "node",
      "args": ["path/to/wechat-agent/dist/index.js", "--mcp"]
    }
  }
}
```

## 🛠️ Tools

### 消息与通讯 (Messaging)

#### 1. `send_message`

发送文本消息给指定联系人。

- **Description**: 查找指定联系人并发送一条或多条文本消息。自动处理"查找-进入对话-输入-发送"的全流程。
- **Parameters**:
  - `contact_name` (string, required): 目标联系人或群聊名称（需通过微信搜索能找到的名称）。
  - `content` (string, required): 消息内容。
- **Example Usage**:
  ```json
  { "contact_name": "张三", "content": "你好，文件已经收到了。" }
  ```

#### 2. `send_file`

发送文件给指定联系人。

- **Description**: 将本地文件发送给联系人。
- **Parameters**:
  - `contact_name` (string, required): 目标联系人名称。
  - `file_path` (string, required): 待发送文件的绝对路径 (Windows 格式)。
- **Example Usage**:
  ```json
  { "contact_name": "项目组", "file_path": "D:\\data\\report_v2.pdf" }
  ```

#### 3. `get_chat_history`

获取最近聊天记录。

- **Description**: 获取指定联系人的最近聊天记录（默认为最近 10 条）。这涉及滚动窗口和 OCR 识别。
- **Parameters**:
  - `contact_name` (string, required): 目标联系人名称。
  - `limit` (integer, optional): 获取的消息条数，默认为 10。
- **Example Usage**:
  ```json
  { "contact_name": "李四" }
  ```

#### 4. `get_unread_summary`

获取未读消息概览。

- **Description**: 获取当前所有未读消息的汇总。系统会检查左侧会话列表，识别有红点的联系人及未读数量。
- **Parameters**: (无)
- **Output Example**:
  ```json
  [
    { "contact": "老板", "count": 2 },
    { "contact": "产品群", "count": 5 }
  ]
  ```

### 联系人管理 (Contacts)

#### 5. `get_contact_list`

获取联系人清单。

- **Description**: 遍历通讯录获取联系人列表。注意：完整遍历可能耗时较长。
- **Parameters**:
  - `category` (string, optional): 筛选类别，如 "tags" (标签), "groups" (群聊), "all" (所有)。默认为 "all"。
- **Example Usage**:
  ```json
  { "category": "groups" }
  ```

### 朋友圈互动 (Moments)

#### 6. `view_moments`

查看朋友圈。

- **Description**: 进入指定联系人的朋友圈（或查看公共朋友圈），并提取最新的动态内容。
- **Parameters**:
  - `contact_name` (string, optional): 目标联系人。如果不填，则查看公共朋友圈流。
  - `count` (integer, optional): 查看的动态条数，默认 3。
- **Example Usage**:
  ```json
  { "contact_name": "王五" }
  ```

#### 7. `like_moments`

朋友圈点赞。

- **Description**: 给朋友圈的一条或多条动态点赞。
- **Parameters**:
  - `target_index` (integer, optional): 点赞第几条动态，默认 1（最新的那条）。
  - `contact_name` (string, optional): 指定联系人的朋友圈。不填则为公共朋友圈。
- **Example Usage**:
  ```json
  { "target_index": 1 }
  ```

## 📖 Resources

### `wechat://screen/current`

- **Type**: `image/png`
- **Description**: 微信窗口的实时截图。

### `wechat://logs/activity`

- **Type**: `text/plain`
- **Description**: 最近的操作日志流。

## Error Handling

- `CONTACT_NOT_FOUND`: 搜索无法匹配到指定联系人。
- `FILE_ACCESS_ERROR`: 指定的文件路径不存在或无法读取。
- `TIMEOUT`: 复杂操作（如获取长列表）超时。
