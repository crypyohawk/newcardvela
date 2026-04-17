#!/bin/bash
cd /opt/cardvela
node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const key = await p.aIKey.findFirst({ where: { newApiTokenName: "proj-7d04a917" }, include: { tier: true }});
  if (!key) { console.log("key not found"); return; }
  console.log("Key:", key.id, "tier:", key.tier?.displayName);
  console.log("Base: in=$" + key.tier?.pricePerMillionInput + "/1M  out=$" + key.tier?.pricePerMillionOutput + "/1M");

  const models = typeof key.tier?.models === "string" ? JSON.parse(key.tier.models) : key.tier?.models;
  
  function findRatio(modelName) {
    if (!Array.isArray(models)) return 1;
    const entry = models.filter(m => m.name && modelName.toLowerCase().includes(m.name.toLowerCase()))
      .sort((a,b) => (b.name?.length||0) - (a.name?.length||0))[0];
    return entry?.ratio || 1;
  }

  const baseIn = key.tier.pricePerMillionInput;
  const baseOut = key.tier.pricePerMillionOutput;

  // 3h calls: opus 8 calls in=550622 out=157999, sonnet 2 calls in=122220 out=20628
  const opusRatio = findRatio("claude-opus-4-6");
  const opusCostIn = (550622/1e6)*baseIn*opusRatio;
  const opusCostOut = (157999/1e6)*baseOut*opusRatio;
  const opusCost = opusCostIn + opusCostOut;

  const sonnetRatio = findRatio("claude-sonnet-4-6");
  const sonnetCostIn = (122220/1e6)*baseIn*sonnetRatio;
  const sonnetCostOut = (20628/1e6)*baseOut*sonnetRatio;
  const sonnetCost = sonnetCostIn + sonnetCostOut;

  console.log("\n=== Our cost calculation (3h) ===");
  console.log("Opus (matched ratio=" + opusRatio + "):");
  console.log("  in: 550,622 tokens * $" + (baseIn*opusRatio) + "/1M = $" + opusCostIn.toFixed(4));
  console.log("  out: 157,999 tokens * $" + (baseOut*opusRatio) + "/1M = $" + opusCostOut.toFixed(4));
  console.log("  subtotal: $" + opusCost.toFixed(4));
  console.log("Sonnet (matched ratio=" + sonnetRatio + "):");
  console.log("  in: 122,220 tokens * $" + (baseIn*sonnetRatio) + "/1M = $" + sonnetCostIn.toFixed(4));
  console.log("  out: 20,628 tokens * $" + (baseOut*sonnetRatio) + "/1M = $" + sonnetCostOut.toFixed(4));
  console.log("  subtotal: $" + sonnetCost.toFixed(4));
  console.log("\nTotal our pricing: $" + (opusCost+sonnetCost).toFixed(4));
  console.log("new-api internal: $3.7944 (their own ratio calc)");
  console.log("Actually deducted: $27.7944 (from cron sync - uses new-api used_quota diff)");

  // Check: the cron deduction is based on new-api used_quota delta, NOT our tier pricing
  console.log("\n=== IMPORTANT: What does the cron actually deduct? ===");
  console.log("Cron reads token.used_quota from new-api and converts with quotaToUSD()");
  console.log("It does NOT use tier pricing at all for the cron path!");
  console.log("quotaToUSD formula: quota / 500000 = USD");
  
  await p.$disconnect();
})()
' 2>&1
