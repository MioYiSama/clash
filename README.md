# Clash Rules

自动聚合并发布 Clash 规则集，每天定时更新。

## 规则集

| 名称          | 内容                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| `ai.yaml`     | OpenAI、Anthropic/Claude、Gemini、BardAI 及自定义补丁（codex、notebooklm、openrouter） |
| `china.yaml`  | SteamCN、国内游戏下载、ChinaMedia、China 直连规则                                      |
| `global.yaml` | Steam、国际游戏下载、GlobalMedia、Global 代理规则                                      |

规则来源：[blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)，通过 jsDelivr CDN 拉取。

## 使用方式

`src/global-extend-script.ts` 是配套的 Clash Profile Script，下载地址：

```
https://static.s3.mioyi.net/clash/global-extend-script.cjs
```

可直接粘贴到订阅编辑器的扩展脚本中使用。它会自动：

- 从订阅中筛选美国节点组成 `US` 分组
- 配置 DNS（国内 `223.5.5.5`，fallback `1.1.1.1` / `8.8.8.8`）
- 注入上述三个规则集

## 本地构建

```bash
pnpm install
pnpm run build
```

构建后规则文件输出至 `outputs/` 目录。

## 自动更新

GitHub Actions 每天 03:00 CST（UTC 19:00）自动构建并将结果同步至 S3。也可在 Actions 页面手动触发。

## 添加自定义规则

在 `patch/` 目录下创建或编辑对应名称的 YAML 文件，格式与上游规则集相同：

```yaml
payload:
  - DOMAIN-KEYWORD,example
  - DOMAIN-SUFFIX,example.com
```

目前只有 `ai` 规则集支持 patch，如需为其他规则集添加 patch，修改 `src/generate-rules.ts` 中对应的 `applyPatch` 调用即可。
