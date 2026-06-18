// oxlint-disable-next-line no-unused-vars
function main(config: any, profileName: string) {
  return {
    ...config,
    dns: {
      enabled: true,
      "enhanced-mode": "redir-host",
      nameserver: ["https://223.5.5.5/dns-query"],
      fallback: ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"],
    },
    "proxy-groups": [
      // ...config["proxy-groups"],
      config["proxy-groups"][0],
      getUsProxyGroup(config),
    ],
    rules: [
      // SSH
      "SRC-PORT,22,DIRECT",
      "DST-PORT,22,DIRECT",
      "IP-CIDR,47.242.86.203/32,DIRECT",
      "IP-CIDR,115.220.1.205/32,DIRECT", // 健康义乌
      "DOMAIN-SUFFIX,hf.co,DIRECT",
      // RuleSet
      "RULE-SET,AI,US",
      "RULE-SET,China,DIRECT",
      `RULE-SET,Global,${profileName}`,
      // Default
      "GEOIP,LAN,DIRECT",
      "GEOIP,CN,DIRECT",
      `MATCH,${profileName}`,
    ],
    "rule-providers": {
      AI: createRuleProvider("AI", "https://static.s3.mioyi.net/clash/ai.yaml"),
      China: createRuleProvider("China", "https://static.s3.mioyi.net/clash/china.yaml"),
      Global: createRuleProvider("Global", "https://static.s3.mioyi.net/clash/global.yaml"),
    },
  };
}

function getUsProxyGroup(config: any) {
  const proxies: Array<string> = [];

  for (const proxy of config["proxies"]) {
    const name = (proxy["name"] as string).toLowerCase();

    if (
      name.includes("美国") ||
      name.includes("🇺🇸") ||
      name.includes("us") ||
      name.includes("america") ||
      name.includes("united states")
    ) {
      proxies.push(name);
    }
  }

  return { name: "US", type: "select", proxies };
}

function createRuleProvider(name: string, url: string, behavior = "classical") {
  return {
    type: "http",
    behavior,
    url,
    path: `./ruleset/${name}.yaml`,
    interval: 86400,
  };
}
