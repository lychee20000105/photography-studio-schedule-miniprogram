# 24h 持续优化系统 v3.0

> 云屿摄影小程序 24 小时无人值守持续优化任务调度中心。
> 当前版本: v2.43 | 最新批次: B31 (setData 路径优化) ✅

---

## 任务队列

| 批次 | 状态 | 版本 | 主题 | 优先级 | 预计工时 |
|------|------|------|------|--------|---------|
| B31 | ✅ 已完成 | v2.43 | setData 路径优化 + calendar animation 合并 | P1 | 15min |
| B32 | ⏳ 待办 | v2.43 | WeCom webhook 硬编码迁移至环境变量 | P2 | 10min |
| B33 | ⏳ 待办 | v2.44 | 各页面生命周期 setData 合并审计（calendar/editor/其他） | P2 | 20min |
| B34 | ⏳ 待办 | v2.44 | 全量云函数 `node --check` 静态分析 + `// TODO` 清理 | P3 | 15min |

## 已完成批次

| 批次 | 版本 | 主题 | 日期 |
|------|------|------|------|
| B27 | v2.18 | H-03 Token 暴力破解防护 | 2026-06-25 |
| B28 | v2.19 | H-01 工资竞态防护 | 2026-06-25 |
| B29 | v2.20 | WXS 视图层过滤器扩展 | 2026-06-25 |
| B30 | v2.30 | 默认 AI 供应商替换为 Agnes | 2026-06-25 |
| B31 | v2.43 | setData 路径优化 + 死代码清理 | 2026-07-01 |
| --   | v2.40 | CC Switch 多供应商切换 | 2026-06-25 |
| --   | v2.41-v2.42 | 编码修复（非批次，全量清扫） | 2026-06-25 |

## 标准操作流程

```
1. 调度器检查队列 → 取下一个未完成批次
2. EnterWorktree(name=opt/v2.xx-bXX) → 创建隔离 worktree
3. 执行优化（Agent / 手动编辑）
4. node --check 语法验证
5. 更新 version.js: current/batch/date
6. 更新 CHANGELOG.md / version-change-diary.md
7. git add → git commit
8. git push origin opt/v2.xx-bXX
9. gh pr create → gh pr merge
10. ExitWorktree(action=remove)
11. 更新本任务队列文件
```

## 版本号规则

- 小批次（1-3 个改动）: +0.01（如 v2.42 → v2.43）
- 中批次（3-5 个改动）: +0.10（如 v2.30 → v2.40）
- 大批次（架构重构）: +1.00（如 v1.86 → v2.00）

## 注意事项

- 所有批次在 **独立 worktree** 中执行，不污染 main 工作区
- 每个批次独立 push → PR → merge
- 合并后立即删除 worktree 和 opt/ 远程分支
- 敏感信息（API Key、Token）永不提交到 git
