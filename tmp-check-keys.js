const{PrismaClient}=require("@prisma/client");
const db=new PrismaClient();
(async()=>{
  const keys=await db.aIKey.findMany({
    where:{id:{in:["cmnsxj6qh007un6d5w7kzkwfd","cmnsvcnww004xn6d58su9iqd5","cmnpxsqzx02dz9m8t506nzn5b"]}},
    select:{id:true,newApiTokenId:true,totalUsed:true,monthUsed:true,lastRemoteUsedUsd:true,lastSyncAt:true,status:true}
  });
  for(const k of keys) console.log(JSON.stringify(k));
  await db.$disconnect();
})();
