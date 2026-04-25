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
    return body.split(" ").slice(0, 200).join(" ") + "...";
  }
}

export async function GET(request, { params }) {
  try {
    const { data: post, error } = await supabase
      .from("posts")
      .select("*, comments(id, comment_text, created_at, user_id)")
      .eq("id", params.id)
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 404 });

    const { data: author } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", post.author_id)
      .single();

    let comments = post.comments || [];
    if (comments.length > 0) {
      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const { data: commentUsers } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);
      const usersMap = {};
      if (commentUsers)
        commentUsers.forEach((u) => {
          usersMap[u.id] = u;
        });
      comments = comments.map((c) => ({
        ...c,
        users: usersMap[c.user_id] || null,
      }));
    }

    return NextResponse.json({ post: { ...post, users: author, comments } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { title, body, image_url, user_id, user_role } = await request.json();
  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", params.id)
    .single();
  if (!post)
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (user_role !== "admin" && post.author_id !== user_id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const summary = await generateSummary(title, body);
  const { data, error } = await supabase
    .from("posts")
    .update({ title, body, image_url, summary })
    .eq("id", params.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

export async function DELETE(request, { params }) {
  const { user_id, user_role } = await request.json();
  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", params.id)
    .single();
  if (!post)
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (user_role !== "admin" && post.author_id !== user_id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { error } = await supabase.from("posts").delete().eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
