import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createAgent, tool } from "npm:langchain";
import "npm:@langchain/openai";
import * as z from "npm:zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const won = (value: unknown) =>
  "₩" + Math.round(Number(value || 0)).toLocaleString("ko-KR");

function isJbFinancialProduct(product: Record<string, any> = {}) {
  const text = [
    product.id,
    product.name,
    product.provider,
    product.issuer,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].filter(Boolean).join(" ");
  return /(JB|전북은행|광주은행|JB금융|전북|광주)/i.test(text);
}

function extractMessageText(message: any) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        return part?.text || part?.content || "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function summarizeProductsForPrompt(products: any[] = []) {
  if (!products.length) return "";
  const lines = products.slice(0, 10).map((product, index) => {
    const limit = product.limits?.maxMonthly || product.limits?.max_monthly || product.max_monthly || "";
    const why = product.coaching?.why || product.description || product.tagline || "";
    return [
      `${index + 1}. ${product.name}`,
      product.provider ? `제공: ${product.provider}` : "",
      product.category ? `분류: ${product.category}` : "",
      product.rate_label ? `금리: ${product.rate_label}` : "",
      product.benefit ? `혜택: ${product.benefit}` : "",
      limit ? `한도: ${won(limit)}` : "",
      why ? `추천맥락: ${why}` : "",
    ].filter(Boolean).join(" / ");
  });
  return `현재 조회된 상품 데이터:\n${lines.join("\n")}`;
}

function summarizeTransactionsForPrompt(transactions: any[] = []) {
  if (!transactions.length) return "";
  const income = transactions
    .filter((tx) => tx.transaction_type === "income")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
  const expense = transactions
    .filter((tx) => tx.transaction_type !== "income")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
  const categoryMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.transaction_type === "income" || tx.is_excluded) continue;
    const label = tx.category_label || tx.category || "기타";
    categoryMap.set(label, (categoryMap.get(label) || 0) + Math.abs(Number(tx.amount || 0)));
  }
  const topCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, amount]) => `- ${label}: ${won(amount)}`)
    .join("\n");
  const recent = transactions.slice(0, 12).map((tx) => (
    `- ${tx.transaction_date} / ${tx.merchant_name || tx.description || tx.category_label || "거래"} / ${won(tx.amount)} / ${tx.category_label || tx.category || "기타"} / ${tx.budget_bucket || "-"}`
  )).join("\n");
  return [
    `현재 조회된 소비/수입 데이터 ${transactions.length}건:`,
    `총수입: ${won(income)}`,
    `총지출: ${won(expense)}`,
    "상위 카테고리:",
    topCategories || "- 없음",
    "최근 거래:",
    recent,
  ].join("\n");
}

function buildSystemPrompt(context: Record<string, unknown> = {}, productPrompt = "", transactionPrompt = "") {
  return [
    "너는 제이비스(JAYBIS)라는 한국어 금융비서다.",
    "대상은 사회초년생이며, 첫 월급 예산, 마이데이터/수기 소비 진단, 청년 금융상품 추천, 상품 추천 흐름 속 금융코칭을 다룬다.",
    "금융상품 추천이나 금융계좌 개설 요청에서는 조건에 맞는 JB금융그룹 계열 상품(전북은행, 광주은행, JB 표기 상품)을 1순위로 우선 추천한다.",
    "JB금융그룹 상품을 먼저 추천하되, 사용자 조건에 맞지 않거나 더 적합한 보조 선택지가 있으면 그 이유를 함께 비교한다.",
    "Supabase 도구를 사용해 최신 runtime data와 financial_products를 확인한 뒤 답한다.",
    "financial_products에서 조회된 상품 데이터가 프롬프트에 있으면, 상품 데이터가 없다고 말하지 말고 그 데이터를 기준으로 맞춤 추천한다.",
    "transactions에서 조회된 소비 데이터가 프롬프트에 있으면, 소비 데이터가 없다고 말하지 말고 그 데이터를 기준으로 소비 진단한다.",
    "데이터를 저장하는 도구는 사용자가 명확히 저장/반영을 승인했을 때만 호출한다.",
    "출력은 GitHub Flavored Markdown으로 정리한다. 첫 줄은 상황에 맞는 이모지 1개와 굵은 한 줄 요약으로 시작한다.",
    "금액, 비율, 실행 항목은 **굵게** 강조하고, 마지막에는 `다음 행동` 1개만 제안한다.",
    context.userName ? `사용자 이름은 ${context.userName}다.` : "",
    context.age ? `사용자 나이는 ${context.age}세다.` : "",
    context.monthlySalary ? `현재 참고 가능한 월급 정보는 ${won(context.monthlySalary)}다.` : "",
    productPrompt,
    transactionPrompt,
  ].filter(Boolean).join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase Edge Function secrets are missing." }, 500);
  }
  if (!openaiKey) {
    return json({ error: "OPENAI_API_KEY secret is missing." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context || {};
  const dataId = body.dataId || Deno.env.get("JAYBIS_DATA_ID") || "default";
  const latestUserText = [...messages].reverse().find((message: any) => message?.who === "me" || message?.role === "user")?.text || body.prompt || "";
  const compactText = String(latestUserText).replace(/\s/g, "");
  const wantsProducts = /(금융상품|상품|추천|적금|청년도약|청약|통장|펀드|가입)/.test(compactText);
  const wantsSpending = /(소비|지출|진단|많이썼|카테고리|고정비|구독|배달|절약)/.test(compactText);

  let prefetchedProducts: any[] = [];
  if (wantsProducts) {
    const { data } = await supabase
      .from("financial_products")
      .select("*")
      .neq("status", "archived")
      .order("rank", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(10);
    prefetchedProducts = (Array.isArray(data) ? data : []).sort((a, b) => {
      const aJb = isJbFinancialProduct(a);
      const bJb = isJbFinancialProduct(b);
      if (aJb !== bJb) return aJb ? -1 : 1;
      return Number(a.rank || 99) - Number(b.rank || 99);
    });
  }
  let prefetchedTransactions: any[] = [];
  if (wantsSpending) {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", dataId)
      .order("transaction_date", { ascending: false })
      .order("posted_at", { ascending: false })
      .limit(80);
    prefetchedTransactions = Array.isArray(data) ? data : [];
  }

  const getRuntimeData = tool(
    async () => {
      const { data, error } = await supabase
        .from("jaybis_runtime_data")
        .select("data")
        .eq("id", dataId)
        .maybeSingle();
      if (error) return JSON.stringify({ warning: error.message, data: {} });
      return JSON.stringify(data?.data || {});
    },
    {
      name: "get_runtime_data",
      description: "사용자의 자산, 예산, 거래내역, 설정 등 JAYBIS 런타임 데이터를 조회한다.",
      schema: z.object({}),
    },
  );

  const listFinancialProducts = tool(
    async ({ category, limit }) => {
      let query = supabase
        .from("financial_products")
        .select("*")
        .neq("status", "archived")
        .order("rank", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true })
        .limit(limit || 10);

      if (category) query = query.eq("category", category);
      const { data, error } = await query;
      if (error) return JSON.stringify({ warning: error.message, products: [] });
      return JSON.stringify(data || []);
    },
    {
      name: "list_financial_products",
      description: "Supabase financial_products 테이블에서 청년 금융상품 목록과 조건, 혜택, 코칭 설명을 조회한다.",
      schema: z.object({
        category: z.string().optional(),
        limit: z.number().min(1).max(20).optional(),
      }),
    },
  );

  const listTransactions = tool(
    async ({ limit }) => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", dataId)
        .order("transaction_date", { ascending: false })
        .order("posted_at", { ascending: false })
        .limit(limit || 80);
      if (error) return JSON.stringify({ warning: error.message, transactions: [] });
      return JSON.stringify(data || []);
    },
    {
      name: "list_transactions",
      description: "Supabase transactions 테이블에서 사용자의 최근 소비/수입 거래내역을 조회한다.",
      schema: z.object({
        limit: z.number().min(1).max(200).optional(),
      }),
    },
  );

  const saveRuntimeBudget = tool(
    async ({ budget }) => {
      const { data: row, error } = await supabase
        .from("jaybis_runtime_data")
        .select("data")
        .eq("id", dataId)
        .maybeSingle();
      if (error) return JSON.stringify({ ok: false, warning: error.message });

      const next = {
        ...(row?.data || {}),
        budget,
        metadata: {
          ...((row?.data || {}).metadata || {}),
          updatedBy: "jaybis_langchain_agent",
          updatedAt: new Date().toISOString(),
        },
      };

      const { error: upsertError } = await supabase
        .from("jaybis_runtime_data")
        .upsert({ id: dataId, data: next, updated_at: new Date().toISOString() });
      if (upsertError) return JSON.stringify({ ok: false, warning: upsertError.message });
      return JSON.stringify({ ok: true });
    },
    {
      name: "save_runtime_budget",
      description: "사용자가 명확히 승인한 예산안을 jaybis_runtime_data에 저장한다.",
      schema: z.object({
        budget: z.record(z.string(), z.any()),
      }),
    },
  );

  const agent = createAgent({
    model: Deno.env.get("JAYBIS_AGENT_MODEL") || "openai:gpt-4.1-mini",
    tools: [getRuntimeData, listFinancialProducts, listTransactions, saveRuntimeBudget],
    systemPrompt: buildSystemPrompt(
      context,
      summarizeProductsForPrompt(prefetchedProducts),
      summarizeTransactionsForPrompt(prefetchedTransactions),
    ),
  });

  const inputMessages = messages
    .filter((message: any) => message?.text || message?.content)
    .map((message: any) => ({
      role: message.who === "ai" || message.role === "assistant" ? "assistant" : "user",
      content: message.text || message.content,
    }));

  const result = await agent.invoke({
    messages: inputMessages.length ? inputMessages : [{ role: "user", content: String(body.prompt || "") }],
  });

  const latestMessage = result?.messages?.at?.(-1);
  return json({
    configured: true,
    usedSupabaseAgent: true,
    text: extractMessageText(latestMessage),
  });
});
