#!/bin/bash
cd /opt/cardvela
node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const tiers = await p.aIServiceTier.findMany({
    include: { provider: { select: { name: true, displayName: true, type: true }}},
  });
  for (const t of tiers) {
    console.log("=== Tier:", t.displayName || t.name, "===");
    console.log("  Provider:", t.provider?.displayName, "("+t.provider?.type+")");
    console.log("  Active:", t.isActive);
    console.log("  Base pricing: Input $" + t.pricePerMillionInput + "/1M  Output $" + t.pricePerMillionOutput + "/1M");
    console.log("  ChannelGroup:", t.channelGroup);
    try {
      const models = typeof t.models === "string" ? JSON.parse(t.models) : t.models;
      if (Array.isArray(models)) {
        console.log("  Model ratios:");
        for (const m of models) {
          const effIn = (t.pricePerMillionInput * (m.ratio||1)).toFixed(2);
          const effOut = (t.pricePerMillionOutput * (m.ratio||1)).toFixed(2);
          console.log("    " + m.name + ": ratio=" + m.ratio + " -> effective $" + effIn + "/1M in, $" + effOut + "/1M out");
        }
      }
    } catch(e) {}
    console.log("");
  }
  await p.$disconnect();
})()
' 2>&1
