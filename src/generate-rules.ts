import { blackmatrix7, buildRuleSet, loyalsoldier, v2fly, type RuleSet } from "./rule-utils.ts";
import { logger } from "./logger.ts";

const ruleSets: Array<RuleSet> = [
  {
    name: "ai",
    sources: [
      blackmatrix7("OpenAI/OpenAI_No_Resolve.yaml"),
      blackmatrix7("Claude/Claude_No_Resolve.yaml"),
      blackmatrix7("Gemini/Gemini_No_Resolve.yaml"),
      blackmatrix7("BardAI/BardAI_No_Resolve.yaml"),
      v2fly("category-ai-!cn"),
    ],
  },
  {
    name: "china",
    sources: [
      blackmatrix7("SteamCN/SteamCN_No_Resolve.yaml"),
      blackmatrix7("Game/GameDownloadCN/GameDownloadCN_No_Resolve.yaml"),
      blackmatrix7("ChinaMedia/ChinaMedia_No_Resolve.yaml"),
      blackmatrix7("China/China_Classical_No_Resolve.yaml"),
      loyalsoldier("direct"),
    ],
  },
  {
    name: "global",
    sources: [
      blackmatrix7("Steam/Steam_No_Resolve.yaml"),
      blackmatrix7("Game/GameDownload/GameDownload_No_Resolve.yaml"),
      blackmatrix7("GlobalMedia/GlobalMedia_Classical_No_Resolve.yaml"),
      blackmatrix7("Global/Global_Classical_No_Resolve.yaml"),
      loyalsoldier("proxy"),
      loyalsoldier("gfw"),
    ],
  },
];

const start = Date.now();
logger.info(`generating ${ruleSets.length} rule sets...`);

try {
  await Promise.all(ruleSets.map(buildRuleSet));
  logger.info(`done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
} catch (error) {
  // oxlint-disable-next-line typescript/restrict-template-expressions
  logger.error(`generation failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
