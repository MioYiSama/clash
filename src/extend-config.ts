import { stripTypeScriptTypes } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { runInNewContext } from "node:vm";
import { parse, stringify } from "yaml";

type ExtendScript = (config: unknown, profileName: string) => unknown;

function parseUrl(source: string): URL | undefined {
  try {
    return new URL(source);
  } catch {
    return undefined;
  }
}

async function loadExtendScript(): Promise<ExtendScript> {
  const sourcePath = new URL("./global-extend-script.ts", import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const context: { main?: unknown } = {};

  runInNewContext(stripTypeScriptTypes(source), context, {
    filename: sourcePath.href,
  });

  const main = context.main;
  if (typeof main !== "function") {
    throw new Error(`No main function found in ${sourcePath.href}`);
  }

  return (config, profileName) => Reflect.apply(main, undefined, [config, profileName]);
}

async function readStdin(): Promise<string> {
  const chunks: Array<string> = [];
  process.stdin.setEncoding("utf8");

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
  }

  return chunks.join("");
}

async function readYaml(source: string): Promise<string> {
  if (source === "-") {
    return readStdin();
  }

  const url = parseUrl(source);
  if (url) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Unsupported input URL protocol: ${url.protocol}`);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "clash-verge/v2.5.2",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    console.log(text);
    return text;
  }

  return readFile(source, "utf8");
}

function decodeBase64(source: string): string | undefined {
  const compact = source.replace(/\s+/g, "");
  if (
    compact.length === 0 ||
    compact.length % 4 === 1 ||
    !/^[A-Za-z0-9+/_-]*={0,2}$/.test(compact)
  ) {
    return undefined;
  }

  const normalized = compact.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = Buffer.from(padded, "base64").toString("utf8");

  return decoded.includes("\uFFFD") ? undefined : decoded;
}

function parseConfig(source: string): unknown {
  let parsed: unknown;
  let parseError: unknown;

  try {
    parsed = parse(source);
  } catch (error) {
    parseError = error;
  }

  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return parsed;
  }

  const decoded = decodeBase64(source);
  console.log(decoded);
  if (decoded) {
    try {
      const decodedConfig: unknown = parse(decoded);
      if (
        typeof decodedConfig === "object" &&
        decodedConfig !== null &&
        !Array.isArray(decodedConfig)
      ) {
        return decodedConfig;
      }
    } catch {
      // Keep the original parse error for a useful failure message below.
    }
  }

  if (parseError) {
    throw parseError;
  }
  throw new Error("Input must be YAML or base64-encoded YAML with a mapping at its root.");
}

function getProfileName(source: string): string {
  if (source === "-") {
    return "stdin";
  }

  const url = parseUrl(source);
  const filePath = url ? url.pathname : source;
  const fileName = basename(filePath);
  const extension = extname(fileName);

  return extension ? fileName.slice(0, -extension.length) : fileName || "profile";
}

async function writeYaml(destination: string | undefined, content: string): Promise<void> {
  if (!destination || destination === "-") {
    process.stdout.write(content);
    return;
  }

  await writeFile(destination, content, "utf8");
}

function printUsage(): void {
  console.error("Usage: pnpm run extend -- <input.yaml|url|-> [output.yaml|-]");
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === "--") {
    args.shift();
  }
  const [inputSource, outputPath, ...extraArgs] = args;

  if (!inputSource || extraArgs.length > 0 || inputSource === "--help" || inputSource === "-h") {
    printUsage();
    if (inputSource === "--help" || inputSource === "-h") {
      return;
    }
    process.exitCode = 1;
    return;
  }

  const config = parseConfig(await readYaml(inputSource));

  const extendConfig = await loadExtendScript();
  const output = stringify(extendConfig(config, getProfileName(inputSource)));
  await writeYaml(outputPath, output);
}

try {
  await run();
} catch (error) {
  console.error(
    `Failed to extend config: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
