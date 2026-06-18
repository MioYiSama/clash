import { parse, stringify } from "yaml";
import { writeFile, readFile } from "node:fs/promises";

function githubUrl(repo: string, branch: string, path: string) {
  return `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${path}`;
}

async function fetchYaml(url: string) {
  const response = await fetch(url);
  const yaml = parse(await response.text());
  if ((yaml["payload"] as Array<string>).length === 0) {
    throw new Error("No rules found");
  }
  return yaml;
}

function toUnique<T>(array: Array<T>): Array<T> {
  return Array.from(new Set(array));
}

async function unify(urls: Array<string>) {
  const yamlList = await Promise.all(urls.map(fetchYaml));
  return yamlList.flatMap((yaml) => yaml["payload"] as Array<string>);
}

async function applyPatch(source: Array<string>, name: string) {
  const patch = parse(await readFile(`patch/${name}.yaml`, { encoding: "utf-8" }));
  source.push(...patch["payload"]);
}

async function writeYaml(name: string, payload: Array<string>) {
  await writeFile(`outputs/${name}.yaml`, stringify({ payload: toUnique(payload) }));
}

const ai = await unify([
  githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/OpenAI/OpenAI_No_Resolve.yaml"),
  githubUrl(
    "blackmatrix7/ios_rule_script",
    "master",
    "rule/Clash/Anthropic/Anthropic_No_Resolve.yaml",
  ),
  githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/Claude/Claude_No_Resolve.yaml"),
  githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/Gemini/Gemini_No_Resolve.yaml"),
  githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/BardAI/BardAI_No_Resolve.yaml"),
]);
await applyPatch(ai, "ai");
await writeYaml("ai", ai);

const china = await unify([
  githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/SteamCN/SteamCN_No_Resolve.yaml"),
  githubUrl(
    "blackmatrix7/ios_rule_script",
    "master",
    "rule/Clash/Game/GameDownloadCN/GameDownloadCN_No_Resolve.yaml",
  ),
  githubUrl(
    "blackmatrix7/ios_rule_script",
    "master",
    "rule/Clash/ChinaMedia/ChinaMedia_No_Resolve.yaml",
  ),
  githubUrl(
    "blackmatrix7/ios_rule_script",
    "master",
    "rule/Clash/China/China_Classical_No_Resolve.yaml",
  ),
]);
await writeYaml("china", china);

const global = await unify([
  githubUrl("blackmatrix7/ios_rule_script", "master", "rule/Clash/Steam/Steam_No_Resolve.yaml"),
  githubUrl(
    "blackmatrix7/ios_rule_script",
    "master",
    "rule/Clash/Game/GameDownload/GameDownload_No_Resolve.yaml",
  ),
  githubUrl(
    "blackmatrix7/ios_rule_script",
    "master",
    "rule/Clash/GlobalMedia/GlobalMedia_Classical_No_Resolve.yaml",
  ),
  githubUrl(
    "blackmatrix7/ios_rule_script",
    "master",
    "rule/Clash/Global/Global_Classical_No_Resolve.yaml",
  ),
]);
await writeYaml("global", global);
