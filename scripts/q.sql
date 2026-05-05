SELECT k.id, k."apiKey", k.status, t."channelGroup", t.name FROM "AIKey" k JOIN "AIServiceTier" t ON k."tierId"=t.id WHERE t."channelGroup"='perplexity-pool' AND k.status='active' LIMIT 3;
