import { parse, stringify } from "yaml";
import { writeFile, readFile } from "node:fs/promises";
import { parseClashRules } from "./parse-v2fly.ts";
import { logger } from "./logger.ts";

function githubUrl(repo: string, branch: string, path: string) {
  return `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${path}`;
}

async function fetchText(url: string) {
  logger.debug(`fetch ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`fetch failed (${response.status}): ${url}`);
  }
  return await response.text();
}

async function fetchYaml(url: string) {
  const yaml = parse(await fetchText(url));
  const rules = yaml["payload"] as Array<string>;

  if (rules.length === 0) {
    throw new Error(`No rules found: ${url}`);
  }
  return rules;
}

function v2flyDataUrl(name: string) {
  return githubUrl("v2fly/domain-list-community", "master", `data/${name}`);
}

/** 提取一段 v2fly 数据中的 include:xxx 文件名 */
function extractIncludes(text: string): Array<string> {
  const names: Array<string> = [];
  for (const line of text.split(/\r?\n/)) {
    let raw = line.trim();
    if (!raw || raw.startsWith("#")) continue;
    raw = raw
      .replace(/\s+#.*$/, "")
      .replace(/\s+@\S+.*$/, "")
      .trim();
    if (raw.startsWith("include:")) {
      const name = raw.slice("include:".length).trim();
      if (name) names.push(name);
    }
  }
  return names;
}

/** 递归预取 v2fly 数据文件及其所有 include 依赖，返回 文件名 -> 内容 的映射 */
async function fetchV2flyTree(rootName: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const queue = [rootName];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (files.has(name)) continue;
    const text = await fetchText(v2flyDataUrl(name));
    files.set(name, text);
    queue.push(...extractIncludes(text));
  }
  return files;
}

async function fetchV2fly(name: string) {
  const files = await fetchV2flyTree(name);
  if (files.size > 1) {
    logger.debug(`v2fly ${name} resolved ${files.size} files (with includes)`);
  }
  const rules = parseClashRules(files.get(name)!, {
    includeResolver: (includeName) => files.get(includeName) ?? null,
  });
  if (rules.length === 0) {
    throw new Error(`No rules found: ${name}`);
  }
  return rules;
}

function toUnique<T>(array: Array<T>): Array<T> {
  return Array.from(new Set(array));
}

async function readPatch(name: string): Promise<Array<string>> {
  const patch = parse(await readFile(`patch/${name}.yaml`, { encoding: "utf-8" }));
  return patch["payload"] as Array<string>;
}

async function writeYaml(name: string, payload: Array<string>) {
  const unique = toUnique(payload);
  await writeFile(`outputs/${name}.yaml`, stringify({ payload: unique }));
  logger.info(
    `[${name}] wrote outputs/${name}.yaml: ${unique.length} rules (${payload.length} before dedupe)`,
  );
}

/** Clash 规则类型 -> QuantumultX 规则类型 */
const QX_TYPE_MAP: Record<string, string> = {
  DOMAIN: "HOST",
  "DOMAIN-SUFFIX": "HOST-SUFFIX",
  "DOMAIN-KEYWORD": "HOST-KEYWORD",
  "DOMAIN-WILDCARD": "HOST-WILDCARD",
  "IP-CIDR": "IP-CIDR",
  "IP-CIDR6": "IP6-CIDR",
  "IP6-CIDR": "IP6-CIDR",
  GEOIP: "GEOIP",
  "USER-AGENT": "USER-AGENT",
};

/**
 * 将一条 Clash 规则转换为 QuantumultX 格式，无法转换时返回 null。
 * 格式为 TYPE,value,policy[,options]，例如 IP-CIDR,1.2.3.0/24,ai,no-resolve。
 */
function clashRuleToQuantumultX(rule: string, policy: string): string | null {
  const parts = rule.split(",").map((part) => part.trim());
  const type = parts[0]?.toUpperCase();
  if (!type) return null;

  const qxType = QX_TYPE_MAP[type];
  // 不支持的规则类型（如 PROCESS-NAME、DOMAIN-REGEX、IP-ASN）直接跳过
  if (!qxType) return null;

  const value = parts[1];
  if (!value) return null;
  // 其余字段为 no-resolve 等选项，需放在策略之后
  const options = parts.slice(2);

  return [qxType, value, policy, ...options].join(",");
}

async function writeQuantumultX(name: string, payload: Array<string>) {
  const converted = toUnique(payload)
    .map((rule) => clashRuleToQuantumultX(rule, name))
    .filter((rule): rule is string => rule !== null);
  await writeFile(`outputs/${name}.list`, converted.join("\n") + "\n");
  logger.info(`[${name}] wrote outputs/${name}.list: ${converted.length} QuantumultX rules`);
}

export type RuleSource = () => Promise<Array<string>>;

export interface RuleSet {
  /** 输出文件名（outputs/<name>.yaml） */
  name: string;
  /** 规则来源 */
  sources: Array<RuleSource>;
  /** 是否合并 patch/<name>.yaml */
  patch?: boolean;
}

/** blackmatrix7/ios_rule_script 的 Clash 规则文件 */
export function blackmatrix7(path: string): RuleSource {
  return () => fetchYaml(githubUrl("blackmatrix7/ios_rule_script", "master", `rule/Clash/${path}`));
}

/** v2fly/domain-list-community 的规则文件（自动解析 include 依赖） */
export function v2fly(name: string): RuleSource {
  return () => fetchV2fly(name);
}

export async function buildRuleSet({ name, sources, patch }: RuleSet) {
  logger.info(`[${name}] building from ${sources.length} sources...`);
  const rules = (await Promise.all(sources.map((source) => source()))).flat();

  if (patch) {
    const extra = await readPatch(name);
    logger.info(`[${name}] applied patch: +${extra.length} rules`);
    rules.push(...extra);
  }

  await writeYaml(name, rules);
  await writeQuantumultX(name, rules);
}
