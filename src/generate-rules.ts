import { parse, stringify } from "yaml";
import { writeFile, readFile } from "node:fs/promises";
import { parseClashRules } from "./parse-v2fly.ts";

function githubUrl(repo: string, branch: string, path: string) {
  return `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${path}`;
}

async function fetchText(url: string) {
  const response = await fetch(url);
  return await response.text();
}

async function fetchYaml(url: string) {
  const yaml = parse(await fetchText(url));
  const rules = yaml["payload"] as Array<string>;

  if (rules.length === 0) {
    throw new Error("No rules found");
  }
  return rules;
}

async function fetchV2fly(url: string) {
  const rules = parseClashRules(await fetchText(url));
  if (rules.length === 0) {
    throw new Error("No rules found");
  }
  return rules;
}

function toUnique<T>(array: Array<T>): Array<T> {
  return Array.from(new Set(array));
}

async function applyPatch(source: Array<string>, name: string) {
  const patch = parse(await readFile(`patch/${name}.yaml`, { encoding: "utf-8" }));
  source.push(...patch["payload"]);
}

async function writeYaml(name: string, payload: Array<string>) {
  await writeFile(`outputs/${name}.yaml`, stringify({ payload: toUnique(payload) }));
}

const aiRaw = await Promise.all([
  fetchYaml(
    githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/OpenAI/OpenAI_No_Resolve.yaml"),
  ),
  fetchYaml(
    githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/Claude/Claude_No_Resolve.yaml"),
  ),
  fetchYaml(
    githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/Gemini/Gemini_No_Resolve.yaml"),
  ),
  fetchYaml(
    githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/BardAI/BardAI_No_Resolve.yaml"),
  ),
  fetchV2fly(githubUrl("v2fly/domain-list-community", "master", "data/openai")),
  fetchV2fly(githubUrl("v2fly/domain-list-community", "master", "data/anthropic")),
  fetchV2fly(githubUrl("v2fly/domain-list-community", "master", "data/google-deepmind")), // from google-gemini
]);
const ai = aiRaw.flat();
await applyPatch(ai, "ai");
await writeYaml("ai", ai);

const chinaRaw = await Promise.all([
  fetchYaml(
    githubUrl(
      "blackmatrix7/ios_rule_script",
      "master",
      "rule/Clash/SteamCN/SteamCN_No_Resolve.yaml",
    ),
  ),
  fetchYaml(
    githubUrl(
      "blackmatrix7/ios_rule_script",
      "master",
      "rule/Clash/Game/GameDownloadCN/GameDownloadCN_No_Resolve.yaml",
    ),
  ),
  fetchYaml(
    githubUrl(
      "blackmatrix7/ios_rule_script",
      "master",
      "rule/Clash/ChinaMedia/ChinaMedia_No_Resolve.yaml",
    ),
  ),
  fetchYaml(
    githubUrl(
      "blackmatrix7/ios_rule_script",
      "master",
      "rule/Clash/China/China_Classical_No_Resolve.yaml",
    ),
  ),
]);
const china = chinaRaw.flat();
await writeYaml("china", china);

const globalRaw = await Promise.all([
  fetchYaml(
    githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/Steam/Steam_No_Resolve.yaml"),
  ),
  fetchYaml(
    githubUrl(
      "blackmatrix7/ios_rule_script",
      "master",
      "rule/Clash/Game/GameDownload/GameDownload_No_Resolve.yaml",
    ),
  ),
  fetchYaml(
    githubUrl(
      "blackmatrix7/ios_rule_script",
      "master",
      "rule/Clash/GlobalMedia/GlobalMedia_Classical_No_Resolve.yaml",
    ),
  ),
  fetchYaml(
    githubUrl(
      "blackmatrix7/ios_rule_script",
      "master",
      "rule/Clash/Global/Global_Classical_No_Resolve.yaml",
    ),
  ),
]);
const global = globalRaw.flat();
await writeYaml("global", global);
