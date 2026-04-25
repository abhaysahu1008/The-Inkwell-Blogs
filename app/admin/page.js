"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { createClient } from "../../lib/supabase";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPage() {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: userData } = await supabase
        .from("users")
        .select("role, id, name")
        .eq("id", session.user.id)
        .single();
      if (!userData || userData.role !== "admin") {
        router.push("/");
        return;
      }
      setUser({ ...session.user, ...userData });
      await fetchAll();
      setLoading(false);
    };
    init();
  }, []);

  const fetchAll = async () => {
    const [postsRes, commentsRes, usersRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, created_at, author_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("comments")
        .select("id, comment_text, created_at, post_id, user_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("id, name, email, role, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const allUsers = usersRes.data || [];
    const usersMap = {};
    allUsers.forEach((u) => {
      usersMap[u.id] = u;
    });

    const allPosts = postsRes.data || [];
    const postsMap = {};
    allPosts.forEach((p) => {
      postsMap[p.id] = p;
    });

    const postsWithAuthors = allPosts.map((p) => ({
      ...p,
      authorName: usersMap[p.author_id]?.name || "Unknown",
    }));
    const commentsEnriched = (commentsRes.data || []).map((c) => ({
      ...c,
      authorName: usersMap[c.user_id]?.name || "Unknown",
      postTitle: postsMap[c.post_id]?.title || "Unknown post",
    }));

    setPosts(postsWithAuthors);
    setComments(commentsEnriched);
    setUsers(allUsers);
  };

  const deletePost = async (id) => {
    if (!confirm("Delete this post and all its comments?")) return;
    await fetch(`/api/posts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, user_role: "admin" }),
    });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const deleteComment = async (id) => {
    if (!confirm("Delete this comment?")) return;
    await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment_id: id,
        user_id: user.id,
        user_role: "admin",
      }),
    });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading)
    return (
      <>
        <Navbar />
        <div className="loading-center">
          <div className="loading-spinner"></div>
        </div>
      </>
    );

  const tabs = [
    { key: "posts", label: `Posts (${posts.length})` },
    { key: "comments", label: `Comments (${comments.length})` },
    { key: "users", label: `Users (${users.length})` },
  ];

  return (
    <>
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>Admin Dashboard</h1>
          <p>Manage all posts, comments, and users.</p>
        </div>
      </div>

      <main className="container" style={{ padding: "2rem 1.5rem 4rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[
            { label: "Total Posts", value: posts.length },
            { label: "Total Comments", value: comments.length },
            { label: "Total Users", value: users.length },
            {
              label: "Authors",
              value: users.filter((u) => u.role === "author").length,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "1.25rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  color: "var(--accent)",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'DM Mono', monospace",
                  marginTop: "0.25rem",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: "2px solid var(--border)",
            marginBottom: "1.5rem",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "0.65rem 1.25rem",
                background: "none",
                border: "none",
                borderBottom:
                  tab === t.key
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                marginBottom: "-2px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? "var(--ink)" : "var(--muted)",
                fontSize: "0.9rem",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "posts" && (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <Link
                        href={`/blog/${post.id}`}
                        style={{ color: "var(--accent)", fontWeight: 500 }}
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td>{post.authorName}</td>
                    <td
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.82rem",
                        color: "var(--muted)",
                      }}
                    >
                      {formatDate(post.created_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <Link
                          href={`/edit/${post.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Edit
                        </Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deletePost(post.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "comments" && (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>By</th>
                  <th>On Post</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: "300px", fontSize: "0.875rem" }}>
                      {c.comment_text?.slice(0, 80)}
                      {c.comment_text?.length > 80 ? "..." : ""}
                    </td>
                    <td>{c.authorName}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                      {c.postTitle?.slice(0, 30)}
                    </td>
                    <td
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.82rem",
                        color: "var(--muted)",
                      }}
                    >
                      {formatDate(c.created_at)}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteComment(c.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "users" && (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                      {u.email}
                    </td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.82rem",
                        color: "var(--muted)",
                      }}
                    >
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          The <span>Inkwell</span> · Admin Panel
        </p>
      </footer>
    </>
  );
}
