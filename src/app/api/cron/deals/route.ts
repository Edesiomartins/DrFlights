import { NextResponse } from "next/server";
import { ingestDeals } from "@/lib/deals/ingest";
import { logger } from "@/lib/utils/logger";
export async function POST(request:Request){const secret=process.env.CRON_SECRET;if(!secret)return NextResponse.json({error:"CRON_SECRET não configurado."},{status:503});if(request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Não autorizado."},{status:401});try{return NextResponse.json({ok:true,...await ingestDeals()});}catch(error){logger.error("cron.deals.failed",{error:error instanceof Error?error.message:"unknown"});return NextResponse.json({error:"Falha ao processar promoções."},{status:500});}}
