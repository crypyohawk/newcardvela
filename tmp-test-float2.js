const{PrismaClient}=require("@prisma/client");
const db=new PrismaClient();
(async()=>{
  const r = await db.$queryRawUnsafe(
    `SELECT id, "totalUsed"::text, "lastRemoteUsedUsd"::text FROM "AIKey" WHERE id = $1`,
    "cmnsxj6qh007un6d5w7kzkwfd"
  );
  console.log("Raw PG values:", JSON.stringify(r));
  
  const r2 = await db.$queryRawUnsafe(
    `SELECT id, "totalUsed"::text, "lastRemoteUsedUsd"::text FROM "AIKey" WHERE id = $1`,
    "cmnsvcnww004xn6d58su9iqd5"
  );
  console.log("Raw PG values:", JSON.stringify(r2));
  
  const r3 = await db.$queryRawUnsafe(
    `SELECT id, "totalUsed"::text, "lastRemoteUsedUsd"::text FROM "AIKey" WHERE id = $1`,
    "cmnpxsqzx02dz9m8t506nzn5b"
  );
  console.log("Raw PG values:", JSON.stringify(r3));
  
  // Test: can PG match its own float values?
  const r4 = await db.$queryRawUnsafe(
    `SELECT count(*) as cnt FROM "AIKey" WHERE id = $1 AND "totalUsed" = 1.7516`,
    "cmnsxj6qh007un6d5w7kzkwfd"
  );
  console.log("PG direct float match:", JSON.stringify(r4));
  
  await db.$disconnect();
})();
