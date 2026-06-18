// oxlint-disable-next-line no-unused-vars
function main(config: any, profileName: string) {
  const defaultProxyGroup = config["proxy-groups"][0];
  const defaultProxyGroupName = defaultProxyGroup.name;

  const result = {
    ...config,
    dns: {
      enabled: true,
      "enhanced-mode": "redir-host",
      nameserver: [
        "https://223.5.5.5/dns-query", // 阿里云DNS
        "https://223.6.6.6/dns-query", // 阿里云备用
      ],
      fallback: [
        "https://1.1.1.1/dns-query", // Cloudflare DNS
        "https://8.8.8.8/dns-query", // Google 备用
        "https://1.0.0.1/dns-query", // Cloudflare DNS
        "https://8.8.4.4/dns-query", // Google 备用
      ],
    },
    "proxy-groups": [
      defaultProxyGroup, // 默认组
      getUsProxyGroup(config), // US组
    ],
    "rule-providers": {
      AI: createRuleProvider("AI", "https://static.s3.mioyi.net/clash/ai.yaml"),
      China: createRuleProvider("China", "https://static.s3.mioyi.net/clash/china.yaml"),
      Global: createRuleProvider("Global", "https://static.s3.mioyi.net/clash/global.yaml"),
    },
    rules: [
      "SRC-PORT,22,DIRECT", // SSH
      "DST-PORT,22,DIRECT", // SSH
      "IP-CIDR,47.242.86.203/32,DIRECT", // mioyi.net
      "IP-CIDR,115.220.1.205/32,DIRECT", // 健康义乌
      "DOMAIN-SUFFIX,hf.co,DIRECT",
      // RuleSet
      "RULE-SET,AI,US",
      "RULE-SET,China,DIRECT",
      `RULE-SET,Global,${defaultProxyGroupName}`,
      // Fallback
      "GEOIP,LAN,DIRECT",
      "GEOIP,CN,DIRECT",
      `MATCH,${defaultProxyGroupName}`,
    ],
  };

  return result;
}

function getUsProxyGroup(config: any) {
  const proxies: Array<string> = [];

  for (const proxy of config["proxies"]) {
    const name = proxy["name"] as string;

    const lower = name.toLowerCase();
    if (
      name.includes("🇺🇸") ||
      name.includes("美国") ||
      lower.includes("usa") ||
      lower.includes("america") ||
      lower.includes("united states")
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
