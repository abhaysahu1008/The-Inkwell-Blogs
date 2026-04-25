"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

const POSTS_PER_PAGE = 6;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name) {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  useEffect(() => {
    fetchPosts();
  }, [page, search]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: POSTS_PER_PAGE });
      if (search) params.append("search", search);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <>
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>Stories worth reading.</h1>
          <p>Ideas, perspectives, and dispatches from writers who mean it.</p>
        </div>
      </div>

      <main className="container">
        <div style={{ paddingTop: "2rem" }}>
          <form className="search-bar" onSubmit={handleSearch}>
            <div className="search-input-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="search-input"
                type="text"
                placeholder="Search posts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-outline">
              Search
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </form>
          {search && (
            <p
              className="text-muted"
              style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
            >
              {total} result{total !== 1 ? "s" : ""} for "{search}"
            </p>
          )}
        </div>

        {loading ? (
          <div className="loading-center">
            <div className="loading-spinner"></div>
            <span>Loading posts...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <h3>No posts found</h3>
            <p>
              {search
                ? "Try a different search term."
                : "Be the first to write something."}
            </p>
          </div>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <article className="post-card" key={post.id}>
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="post-card-image"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="post-card-image-placeholder">✍</div>
                )}
                <div className="post-card-body">
                  <div className="post-card-meta">
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <h3>
                    <Link href={`/blog/${post.id}`}>{post.title}</Link>
                  </h3>
                  {post.summary && (
                    <p className="post-card-summary">{post.summary}</p>
                  )}
                  <div className="post-card-footer">
                    <div className="post-card-author">
                      <div className="avatar-sm">
                        {getInitials(post.users?.name)}
                      </div>
                      <span>{post.users?.name || "Anonymous"}</span>
                    </div>
                    <Link
                      href={`/blog/${post.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Read →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={page === p ? "active" : ""}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            >
              →
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          The <span>Inkwell</span> · Built for Hivon Automations Internship
          Assignment
        </p>
      </footer>
    </>
  );
}
