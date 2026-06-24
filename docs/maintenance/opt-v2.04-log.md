# opt-v2.04-log

## B11: AI 聊天气泡 UI 升级

**分支**: `opt/v2.04-b11`
**日期**: 2026-06-25
**状态**: 完成

### 改动文件

1. `miniprogram/cmpts/work_pet/work_pet.wxml` — 聊天气泡模板重构
2. `miniprogram/cmpts/work_pet/work_pet.wxss` — 气泡样式、Markdown 样式、动画
3. `miniprogram/cmpts/work_pet/work_pet.js` — Markdown 解析、消息限制、发送状态
4. `miniprogram/version.js` — 版本记录

### 改动详情

#### 1. 聊天气泡 UI 美化 (work_pet.wxss)
- 用户消息气泡: 品牌色渐变背景 `linear-gradient(135deg, #537d96, #476d83)`，白色文字，圆角气泡
- AI 消息气泡: 左侧带圆形头像("猫"字)，浅暖色背景 `rgba(255, 255, 255, .92)`，深色文字
- 气泡间距从 16rpx 增加到 20rpx
- 渐入动画: `msg-enter` keyframes (opacity 0->1 + translateY 16rpx->0, 250ms ease-out)
- 顺序消息有 stagger delay (30ms 递增)

#### 2. Markdown 渲染 (work_pet.js + work_pet.wxml)
- `parseMarkdownBlocks()` 函数: 正则预处理 AI 回复文本，转为模板可渲染的 blocks 数组
- 支持的 Markdown 元素:
  - 标题 (h1-h3)
  - **粗体** (inline `**text**`)
  - 无序列表 (- item)
  - 有序列表 (1. item)
  - 代码块 (``` fenced ```)，带复制按钮
  - 行内代码 (`code`)
  - 分隔线 (---)
  - 混合段落 (bold + normal 混排)
- `enrichMessagesWithBlocks()` 在消息显示时自动为 assistant 消息添加 blocks
- WXML 中通过 `wx:if="{{item.blocks}}"` 分支渲染，无 blocks 时退回原始 `<view>{{item.content}}</view>`

#### 3. 输入区域优化 (work_pet.wxml + work_pet.wxss)
- 发送按钮: 从文字"发送"改为圆形箭头图标 (↑)
- 发送中状态: `chatSending` 数据字段控制，发送按钮显示 CSS 旋转 spinner
- 输入框添加 `adjust-position="{{true}}"` 和 `bindfocus="bindInputFocus"` 实现键盘弹起自动滚动

#### 4. 长消息性能 (work_pet.js)
- `CHAT_RENDER_LIMIT = 50`: `openChat`、`bindSwitchChat`、`bindDeleteChat` 只渲染最近 50 条
- `chatHasOlder` 数据字段: 超过 50 条时显示"查看更早消息"按钮
- `bindLoadOlderMessages()`: 点击后加载全部消息
- `splitIntoSentences()`: 按句号/感叹号/问号/换行拆分，用于逐句打字机

#### 5. 打字机效果升级 (work_pet.js)
- `_typewriterDisplay()` 改为句子级渲染: 拆分句子后逐句显示
- 每句结束后有自然停顿 (标点句 3x delay, 普通句 1.5x delay)
- 打字完成后才调用 `enrichMessagesWithBlocks()` 显示完整 Markdown 格式
- `_typewriterCharDisplay()` 保留作为单句回退方案
- 所有打字机完成分支都设置 `chatSending: false`

#### 6. 样式兼容性
- Warm paper overrides 更新: 旧的 `.chat-msg.user .chat-bubble` 和 `.chat-msg.assistant .chat-bubble` 覆盖规则与新 B11 样式统一
- 发送按钮 warm paper 覆盖使用 `linear-gradient` 和 `opacity` 替代旧的 `background: #b8b0a3`

### 约束确认
- 未修改 `cloudfunctions/` 下任何文件
- 未修改 `app.json` 的 pages 列表
- `chatMessages` 数据结构不变（只新增可选 `blocks` 字段用于渲染）
- 小程序原生开发，未引入 npm 包
