# Clash Rules

[![build](https://github.com/MioYiSama/clash/actions/workflows/build.yml/badge.svg)](https://github.com/MioYiSama/clash/actions/workflows/build.yml)

自动聚合、去重并发布 Clash / QuantumultX 规则集，每日定时更新。

## 规则集

| 规则集 | 说明 | 文件 |
| --- | --- | --- |
| `ai` | OpenAI、Anthropic/Claude、Gemini、BardAI 等 AI 服务 | [`ai.yaml`](outputs/ai.yaml) · [`ai.list`](outputs/ai.list) |
| `china` | SteamCN、国内游戏下载、ChinaMedia、中国大陆直连 | [`china.yaml`](outputs/china.yaml) · [`china.list`](outputs/china.list) |
| `global` | Steam、国际游戏下载、GlobalMedia、国际代理 | [`global.yaml`](outputs/global.yaml) · [`global.list`](outputs/global.list) |

规则来源：

- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)
- [v2fly/domain-list-community](https://github.com/v2fly/domain-list-community)

通过 jsDelivr CDN 拉取上游，合并、去重后输出。

## 输出格式

每个规则集同时生成两种格式：

- **Clash**：`outputs/<name>.yaml`，`payload` 数组形式。
- **QuantumultX**：`outputs/<name>.list`，每行一条规则，格式为 `TYPE,value,policy[,options]`。

### Clash → QuantumultX 类型映射

| Clash | QuantumultX |
| --- | --- |
| `DOMAIN` | `HOST` |
| `DOMAIN-SUFFIX` | `HOST-SUFFIX` |
| `DOMAIN-KEYWORD` | `HOST-KEYWORD` |
| `DOMAIN-WILDCARD` | `HOST-WILDCARD` |
| `IP-CIDR` | `IP-CIDR` |
| `IP-CIDR6` | `IP6-CIDR` |
| `GEOIP` | `GEOIP` |
| `USER-AGENT` | `USER-AGENT` |

QuantumultX 不支持的类型（如 `PROCESS-NAME`、`DOMAIN-REGEX`、`IP-ASN`）会被自动跳过。

## 在线使用

规则文件每日自动同步到 S3：

```text
https://static.s3.mioyi.net/clash/ai.yaml
https://static.s3.mioyi.net/clash/china.yaml
https://static.s3.mioyi.net/clash/global.yaml
```

### 配套 Clash 扩展脚本

下载已构建好的 Profile 脚本：

```text
https://static.s3.mioyi.net/clash/global-extend-script.cjs
```

直接粘贴到订阅编辑器的“扩展脚本”中即可。它会自动完成：

- 从订阅节点中筛选美国节点，组成 `US` 分组
- 配置 DNS（国内 `223.5.5.5`，fallback `1.1.1.1` / `8.8.8.8`）
- 注入 `ai`、`china`、`global` 三个规则集

## 本地构建

要求：Node.js 26+，pnpm 11.7.0+

```bash
pnpm install
pnpm run build
```

构建产物会输出到 `outputs/` 目录：

```text
outputs/
├── ai.yaml
├── ai.list
├── china.yaml
├── china.list
├── global.yaml
├── global.list
└── global-extend-script.cjs
```

## 添加自定义规则

1. 在 `patch/` 目录下创建与规则集同名的 YAML 文件，例如 `patch/ai.yaml`：

```yaml
payload:
  - DOMAIN-KEYWORD,example
  - DOMAIN-SUFFIX,example.com
```

2. 在 [`src/generate-rules.ts`](src/generate-rules.ts) 中把对应规则集的 `patch` 设为 `true`：

```typescript
{
  name: "ai",
  sources: [...],
  patch: true,
}
```

3. 重新运行 `pnpm run build`。

## 自动更新

GitHub Actions 每天北京时间 03:00（UTC 19:00）自动构建，并将产物同步到 S3。也可以在 Actions 页面手动触发。

## License

[MIT](LICENSE)
