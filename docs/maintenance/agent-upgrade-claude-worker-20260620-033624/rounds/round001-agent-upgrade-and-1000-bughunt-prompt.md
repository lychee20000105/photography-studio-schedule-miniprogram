Supervisor Digest 要求：你所有主要输出文件开头必须包含不超过 12 行的 Supervisor Digest，说明决策需求、修改文件、测试、通过/失败、commit 状态、阻塞点。

你是 Claude CLI 长时执行工人，上层监督者是小云1号/Codex。请在仓库内完成“微信小程序内置 Agent 尽可能免费升级”的长跑任务。你可以读取源码、运行命令、编辑文件、提交本地 git commit，但不要 push/deploy/永久删除/泄露密钥。

项目仓库：W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo
外部方案目录：C:\Users\Administrator\Documents\Claude Desktop\e7f6dae1-89d6-497e-a331-f3d51f6e435e
维护输出目录：W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-claude-worker-20260620-033624
目标结束时间：2026-06-20T15:36:24.3196564+08:00（Asia/Shanghai，最多运行约 12 小时；如果提前完成，也必须完整产出 final-summary.md）

总目标：吸收方案目录中的所有 md 分析文档，先优化并统一成可落地方案，再对微信小程序内置 Agent 做代码升级、文档升级、版本记录迭代和本地 git 提交；最后执行不少于 1000 次 bug 查找/修复巡检，把巡检计数、发现、修复、无法安全修复项全部写入维护文档。

硬性要求：
1. 不要推送、不要部署、不要公开发布、不要永久删除文件、不要记录或泄露任何 API Key/App Secret/OAuth Token/密码。
2. 小李希望“尽可能免费升级”：默认保留/兼容当前免费模型 API，不引入必须付费的新模型服务；如需新增能力，优先用本地逻辑、提示词、记忆、检索、缓存、工具编排、降级策略、免费额度服务或可选配置。
3. 先阅读方案目录所有 md 文件，输出统一方案优化文档到维护目录，包含：目标边界、MVP、免费优先路线、风险、回滚方案、验收标准。
4. 代码升级要小步迭代；每个稳定阶段更新 CHANGELOG.md 或维护目录版本记录，并做本地 git commit。不要一次性大改不可回滚。
5. 维护这些状态文件：W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-claude-worker-20260620-033624\token-budget-summary.json、W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-claude-worker-20260620-033624\longrun-status.json、W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-claude-worker-20260620-033624\longrun-heartbeat.md、W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-claude-worker-20260620-033624\longrun-progress.md。
6. 不少于 1000 次 bug 查找/修复：按静态扫描、配置检查、边界用例、AI 回复解析、流式回复、记忆/知识库、会话管理、微信小程序兼容、云函数、安全、性能、免费 API 降级等维度拆分。必须维护 W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-claude-worker-20260620-033624\bug-hunt-1000-counter.json，字段包含 targetTotal>=1000、completedChecks、fixedCount、remainingRisks。
7. 修 bug 必须真实、可验证，不要为了凑数制造无意义修改；如果发现问题不能安全修复，记录为 remainingRisks。
8. 每轮尽量运行可用的 lint/test/build/静态检查；如果环境缺少微信开发者工具，只记录手动验收清单。
9. 最终输出 W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-claude-worker-20260620-033624\final-summary.md，列出修改文件、提交列表、测试结果、版本变化、剩余风险、回滚方式、下一步人工验收。
10. 如果你需要继续很久，请每完成一个阶段刷新 token-budget-summary.json 和 longrun-heartbeat.md，便于小云1号只读摘要监督。

建议执行顺序：
A. 建立项目地图和方案整合文档。
B. 设计免费优先 Agent 升级架构。
C. 分批实现最小可用升级，保持兼容旧数据和旧 API。
D. 更新版本记录并本地 commit。
E. 开始 1000+ bug-hunt 长巡检，边查边修边提交。
F. 最终审计与总结。
