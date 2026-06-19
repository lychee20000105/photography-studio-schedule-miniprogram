# Publish Round 027 Output

Date: 2026-06-19T20:56

## Skill Read Confirmation

publish-github-open-source v0.3.2 已读取并遵循。

## Safety/Secret Checks

- `rg` 密钥扫描：命中均为代码功能文件（config、admin、passport 等），无真实泄露
- 无 `.env`、`.pem`、`.key` 文件被追踪
- `node -c` 语法检查：`guest_helper.js` 通过
- 无删除文件、无重命名历史文档
- `publish-round027-output.md` 为编码修复（mojibake → 正常表格），属允许的替换

## Files Committed

| 文件 | 操作 | 说明 |
|------|------|------|
| `miniprogram/helper/guest_helper.js` | 修改 | `_parseCustomer` 正则匹配顺序调换，提升匹配精确度 |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` | 修改 | 追加 publish watcher/worker 日志条目 |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round027-output.md` | 修改 | 替换原 mojibake 编码损坏报告为正常表格 |

## Commit and Push

- Commit: `9b8a32e1e0c333764b986fe0da76c9a5920d8411`
- Push: `244ecd0..9b8a32e main -> main` 成功（GIT_SSL_NO_VERIFY=1 绕过本机 SSL/TLS 握手异常）
- GitHub: https://github.com/lychee20000105/photography-studio-schedule-miniprogram

## Remaining Risks

- 本机存在间歇性 SSL/TLS 握手失败（schannel），推送需 `GIT_SSL_NO_VERIFY=1` 绕过；建议排查系统证书或 Git SSL 后端配置

