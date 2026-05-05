UPDATE "AIServiceTier" SET "modelGroup" = 'perplexity' WHERE "channelGroup" = 'perplexity-pool';
SELECT id, name, "channelGroup", "modelGroup", "isActive" FROM "AIServiceTier" WHERE "channelGroup" = 'perplexity-pool';
