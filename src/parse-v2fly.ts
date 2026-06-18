type ClashRuleType = "DOMAIN-SUFFIX" | "DOMAIN" | "DOMAIN-REGEX" | "DOMAIN-KEYWORD";

export interface ParseClashRulesOptions {
  keyword?: boolean;
  dedupe?: boolean;
  keepTag?: boolean;

  /**
   * 处理 include:xxx
   *
   * 返回：
   * - string：把 include 内容当作文本继续解析
   * - string[]：把 include 内容当作原始行继续解析
   * - null / undefined：跳过这个 include
   */
  includeResolver?: (name: string) => string | string[] | null | undefined;
}

export function parseClashRules(text: string, options: ParseClashRulesOptions = {}): string[] {
  const rules: string[] = [];
  const seen = new Set<string>();
  const includeStack = new Set<string>();

  const dedupe = options.dedupe ?? true;

  function addRule(rule: string) {
    if (dedupe) {
      if (seen.has(rule)) return;
      seen.add(rule);
    }

    rules.push(rule);
  }

  function parseText(input: string) {
    for (const originalLine of input.split(/\r?\n/)) {
      const parsed = parseLine(originalLine, options);

      if (!parsed) continue;

      if (parsed.type === "include") {
        const name = parsed.name;

        if (!options.includeResolver) continue;

        // 防止 A include B，B 又 include A
        if (includeStack.has(name)) continue;

        const included = options.includeResolver(name);

        if (!included) continue;

        includeStack.add(name);

        if (Array.isArray(included)) {
          parseText(included.join("\n"));
        } else {
          parseText(included);
        }

        includeStack.delete(name);
        continue;
      }

      addRule(parsed.rule);
    }
  }

  parseText(text);

  return rules;
}

type ParsedLine =
  | {
      type: "rule";
      rule: string;
    }
  | {
      type: "include";
      name: string;
    };

function parseLine(line: string, options: ParseClashRulesOptions): ParsedLine | null {
  let raw = line.trim();

  if (!raw) return null;
  if (raw.startsWith("#")) return null;

  raw = raw.replace(/\s+#.*$/, "").trim();

  if (!raw) return null;

  let tag = "";

  if (!options.keepTag) {
    raw = raw.replace(/\s+@\S+.*$/, "").trim();
  } else {
    const match = raw.match(/\s+(@\S+.*)$/);

    if (match) {
      tag = ` ${match[1]!.trim()}`;
      raw = raw.slice(0, match.index).trim();
    }
  }

  if (!raw) return null;

  if (raw.startsWith("include:")) {
    const name = raw.slice("include:".length).trim();

    if (!name) return null;

    return {
      type: "include",
      name,
    };
  }

  let ruleType: ClashRuleType;
  let value: string;

  if (raw.startsWith("regexp:")) {
    ruleType = "DOMAIN-REGEX";
    value = raw.slice("regexp:".length).trim();
  } else if (raw.startsWith("full:")) {
    value = normalizeDomain(raw.slice("full:".length));

    if (options.keyword) {
      ruleType = "DOMAIN-KEYWORD";
      value = domainToKeyword(value);
    } else {
      ruleType = "DOMAIN";
    }
  } else {
    value = normalizeDomain(raw);

    if (options.keyword) {
      ruleType = "DOMAIN-KEYWORD";
      value = domainToKeyword(value);
    } else {
      ruleType = "DOMAIN-SUFFIX";
    }
  }

  if (!value) return null;

  return {
    type: "rule",
    rule: `${ruleType},${value}${tag}`,
  };
}

function normalizeDomain(domain: string): string {
  return domain.trim().replace(/^\.+/, "").replace(/\.+$/, "").toLowerCase();
}

function domainToKeyword(domain: string): string {
  const normalized = normalizeDomain(domain);

  if (!normalized) return "";

  const parts = normalized.split(".").filter(Boolean);

  return parts[0] ?? "";
}
