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
      "fake-ip-range": "198.18.0.1/16",
      "cache-algorithm": "arc",
      nameserver: [
        "https://223.5.5.5/dns-query#disable-qtype-64=true&disable-qtype-65=true",
        "https://223.6.6.6/dns-query#disable-qtype-64=true&disable-qtype-65=true",
      ],
      "proxy-server-nameserver": [
        "https://223.5.5.5/dns-query#disable-qtype-64=true&disable-qtype-65=true",
      ],
    },
    "proxy-groups": [
      {
        name: "DEFAULT",
        type: "select",
        proxies: config["proxies"].map((proxy: { name: string }) => proxy.name),
      },
      {
        name: "AI",
        type: "select",
        proxies: config["proxies"].map((proxy: { name: string }) => proxy.name),
      },
    ],

    rules: [
      "SRC-PORT,22,DIRECT",
      "DST-PORT,22,DIRECT",
      "DOMAIN-SUFFIX,local,DIRECT",
      "IP-CIDR,115.220.1.205/32,DIRECT",
      "DOMAIN-SUFFIX,hf.co,DIRECT",

      "RULE-SET,AI,AI",
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
