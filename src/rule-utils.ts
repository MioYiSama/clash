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
}
