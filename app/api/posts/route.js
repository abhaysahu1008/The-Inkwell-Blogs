import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function generateSummary(title, body) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 10000),
    );
    const result = await Promise.race([
      model.generateContent(
        `Write a 200-word summary in third person. Only the summary.\nTitle: ${title}\nContent: ${body.slice(0, 3000)}`,
      ),
      timeoutPromise,
    ]);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err.message);
    return body.split(" ").slice(0, 200).join(" ") + "...";
  }
}

export async function POST(request) {
  try {
    const { title, body, image_url, author_id } = await request.json();
    if (!title || !body || !author_id)
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );

    const summary = await generateSummary(title, body);

    const { data: post, error } = await supabase
      .from("posts")
      .insert({ title, body, image_url, author_id, summary })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 6;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let postsQuery = supabase
      .from("posts")
      .select("id, title, summary, image_url, created_at, author_id", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) postsQuery = postsQuery.ilike("title", `%${search}%`);

    const { data: posts, count, error: postsError } = await postsQuery;
    if (postsError)
      return NextResponse.json({ error: postsError.message }, { status: 500 });

    if (!posts || posts.length === 0)
      return NextResponse.json({ posts: [], total: 0 });

    const authorIds = [...new Set(posts.map((p) => p.author_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, name")
      .in("id", authorIds);

    const usersMap = {};
    if (users)
      users.forEach((u) => {
        usersMap[u.id] = u;
      });

    const merged = posts.map((post) => ({
      ...post,
      users: usersMap[post.author_id] || null,
    }));

    return NextResponse.json({ posts: merged, total: count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
