import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function POST(request) {
  try {
    const { post_id, user_id, comment_text } = await request.json();
    if (!post_id || !user_id || !comment_text?.trim())
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({ post_id, user_id, comment_text: comment_text.trim() })
      .select("id, comment_text, created_at, user_id")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: userData } = await supabase
      .from("users")
      .select("name")
      .eq("id", user_id)
      .single();

    return NextResponse.json(
      {
        comment: { ...comment, users: userData || null },
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { comment_id, user_id, user_role } = await request.json();
    if (!comment_id)
      return NextResponse.json(
        { error: "Missing comment_id" },
        { status: 400 },
      );

    if (user_role !== "admin") {
      const { data: comment } = await supabase
        .from("comments")
        .select("post_id")
        .eq("id", comment_id)
        .single();
      const { data: post } = await supabase
        .from("posts")
        .select("author_id")
        .eq("id", comment?.post_id)
        .single();
      if (!post || post.author_id !== user_id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment_id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
