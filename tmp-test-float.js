const{PrismaClient}=require("@prisma/client");
const db=new PrismaClient({log:['query']});
(async()=>{
  // Test: read a key and then do updateMany with the same Float values
  const key = await db.aIKey.findUnique({
    where: { id: "cmnsxj6qh007un6d5w7kzkwfd" },
    select: { id:true, totalUsed:true, lastRemoteUsedUsd:true, lastSyncAt:true }
  });
  console.log("READ:", JSON.stringify(key));
  console.log("totalUsed type:", typeof key.totalUsed, "value:", key.totalUsed);
  console.log("lastRemoteUsedUsd type:", typeof key.lastRemoteUsedUsd, "value:", key.lastRemoteUsedUsd);

  // Try updateMany with exact values (dry run: only update lastSyncAt)
  const result = await db.aIKey.updateMany({
    where: {
      id: key.id,
      totalUsed: key.totalUsed,
      lastRemoteUsedUsd: key.lastRemoteUsedUsd,
    },
    data: {
      lastSyncAt: new Date(),
    },
  });
  console.log("UPDATE RESULT count:", result.count);
  
  if (result.count === 0) {
    console.log("!!! FLOAT COMPARISON FAILED - This is the bug!");
    // Try with just id
    const result2 = await db.aIKey.updateMany({
      where: { id: key.id },
      data: { lastSyncAt: new Date() },
    });
    console.log("UPDATE with id-only count:", result2.count);
  } else {
    console.log("Float comparison works fine - race is from concurrency");
  }
  
  await db.$disconnect();
})();
