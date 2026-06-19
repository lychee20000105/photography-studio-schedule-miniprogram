## 版本来源

本 Release 使用项目真实版本号：`miniprogram/version.js` 的 `current: 1.72`。

## 本次修正

- 纠正发布命名规则：不再用 `v1.1.x` 这种过低版本，也不再用临时轮次号冒充项目版本。
- 后续 GitHub Release 必须读取 `miniprogram/version.js` 当前版本，并交叉检查更新记录。
- 长跑监督流程新增 token 节流：Claude 负责执行和摘要，Codex 先读 `token-budget-summary.json`，不再默认读大日志和大 diff。

## 已包含的主要能力

- 小猫 AI 截图/文字录单日期、收款类型、访客客户名、金额、商拍/写真/跟拍等识别修复。
- GitHub 发布流程：push 代码后必须创建/更新 Release。
