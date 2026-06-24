# 云屿摄影小程序 24h 持续优化系统

## 架构设计：防上下文爆炸

```
主线程（调度器）          后台 Agent Worker
────────────────         ─────────────────
- 创建 worktree          - 在隔离上下文中执行
- 分配任务               - 不污染主线程上下文
- 收集结果               - 完成后返回结构化报告
- git commit / push      - 自动清理
- 更新任务队列
- 写入版本日志
```

### 核心原则
1. **主线程只做调度**，不做超过 50 行的代码修改
2. **每个优化批次独立 worktree**，分支 `opt/v2.0X-batchN`
3. **每批完成后必须**：版本号 → 日志 → commit → push → merge to main
4. **任务队列持久化**到文件，上下文压缩后可恢复
5. **并行扫描、串行修复**：多个 agent 可同时扫描，但修复必须串行（避免冲突）

## 任务队列

### 已完成
- [x] Batch 1: 紧急 Bug 修复 (v2.01-b1) — clearTimer + token ceiling
- [x] Batch 2: 安全加固 (v2.01-b2) — rate limit + sanitize + content safety
- [x] Batch 3: 性能优化 (v2.01-b3) — N+1 fix + cache + typewriter + chooseMedia
- [x] Batch 4: 代码清理 (v2.01-b4) — shared helpers + imgTypeCheck + aliases
- [x] Batch 5: 维护清理 + v2.01 发布 (v2.01-b5)

### 后端优化队列 (v2.02)
- [x] B6: 输入验证加固 — 所有 controller 参数校验 ✅
- [x] B7: 前端交互优化 — 图片懒加载 + 骨架屏 + setData 精确路径 ✅
- [x] B8: 框架层 Bug 修复 — 8 个确认 Bug ✅
- [x] B9: 服务层安全修复 — 权限提升 + 数据泄露 + 正则 + 除零 ✅
- [x] B10: 调试代码清理 — 空 catch 块 + 错误处理统一 ✅

### 前端交互优化队列 (v2.04)
- [x] B11: AI 聊天气泡 UI 升级 — 气泡美化 + Markdown渲染 + 长消息优化 ✅
- [x] B12: 日历滑动体验优化 — 手势切换 + 日期标记 + 今日高亮 ✅

### 安全加固队列 (v2.05-v2.06)
- [x] B13: 安全加固 — TEST_MODE断言 + db clear防护 + whereEx限制 ✅
- [ ] B14: Object字段白名单 + 性能监控基础 ⏳ 执行中
- [x] B15: 框架层 console 清理 + application.js 日志标准化 ✅ (41→14个)

### 新方向探索队列 (v2.07-v2.08)
- [x] B16: 微信小程序离线能力 — 离线缓存 + 数据预加载 + 网络恢复策略 ✅
- [x] B17: 暗黑模式支持 — CSS 变量主题切换 ✅
- [ ] B18: 性能监控体系 — 首屏时间 + setData 耗时 + 云函数延迟
- [ ] B19: AI 聊天流式渲染 — wx.request enableChunked + 缓冲节流 ⏳ 执行中
- [ ] B20: recycle-view 虚拟列表 — 触底加载 + 分页 ⏳ 执行中
- [ ] B19: AI 聊天流式渲染 — wx.request enableChunked + 缓冲节流
- [ ] B20: recycle-view 虚拟列表 — 聊天和工单长列表优化

### HanaAgent 迁移队列 (v3.00+)
- [ ] Phase 1: 工具注册表 + Agent Manager + 会话后端化
- [ ] Phase 2: 三层记忆架构
- [ ] Phase 3: 技能系统
- [ ] Phase 4: 流式回复 + 联网搜索
- [ ] Phase 5: 配置化 + 多 Agent 协作

## 循环节奏

每个循环约 20-30 分钟：
1. 从队列取下一个任务
2. 创建 worktree
3. 启动 agent 执行
4. 收集结果 → 审查 → commit → push → merge
5. 更新队列和日志
6. 进入下一循环
