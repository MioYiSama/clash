function createRuleProvider(name: string, url: string, behavior = "classical") {
  return { type: "http", behavior, url, path: `./ruleset/${name}.yaml`, interval: 86400 };
}

// oxlint-disable-next-line no-unused-vars
function main(config: any, _profileName: string) {
  return {
    ...config,
    dns: {
      enable: true,
      "enhanced-mode": "fake-ip",
      nameserver: ["https://223.5.5.5/dns-query", "https://223.6.6.6/dns-query"],
      fallback: [
        "https://1.1.1.1/dns-query",
        "https://8.8.8.8/dns-query",
        "https://1.0.0.1/dns-query",
        "https://8.8.4.4/dns-query",
      ],
      "disable-qtype-64": true,
      "disable-qtype-65": true,
    },
    "proxy-groups": [
      {
        name: "DEFAULT",
        type: "select",
        proxies: config["proxies"].map((proxy: any) => proxy.name),
      },
      {
        name: "US",
        type: "select",
        proxies: config["proxies"]
          .filter((proxy: any) => proxy.name.includes("美国") || proxy.name.includes("🇺🇸"))
          .map((proxy: any) => proxy.name),
      },
    ],

    rules: [
      "SRC-PORT,22,DIRECT",
      "DST-PORT,22,DIRECT",
      "DOMAIN-SUFFIX,local,DIRECT",
      "IP-CIDR,47.242.86.203/32,DIRECT",
      "IP-CIDR,115.220.1.205/32,DIRECT",
      "IP-CIDR,43.133.43.22/32,DIRECT",
      "DOMAIN-SUFFIX,hf.co,DIRECT",
      `DOMAIN-SUFFIX,tangbai.cc,DEFAULT`,

      "RULE-SET,AI,US",
      "RULE-SET,China,DIRECT",
      "RULE-SET,Global,DEFAULT",

      "GEOIP,LAN,DIRECT",
      "GEOIP,CN,DIRECT",
      "MATCH,DEFAULT",
    ],
    "rule-providers": {
      AI: createRuleProvider("AI", "https://static.s3.mioyi.net/clash/ai.yaml"),
      China: createRuleProvider("China", "https://static.s3.mioyi.net/clash/china.yaml"),
      Global: createRuleProvider("Global", "https://static.s3.mioyi.net/clash/global.yaml"),
    },
  };
}
