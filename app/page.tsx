"use client";

import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  created_at: string;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");


 useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
  });

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
    }
  );

  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

const fetchBookmarks = async () => {
  const { data } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });

  setBookmarks(data || []);
};

useEffect(() => {
  if (!session) return;

  const loadBookmarks = async () => {
    await fetchBookmarks();
  };

  loadBookmarks();

  const channel = supabase
    .channel("realtime bookmarks")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookmarks" },
      fetchBookmarks
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [session]);


 async function addBookmark() {
  if (!title || !url || !session) return;

  await supabase.from("bookmarks").insert([
    {
      title,
      url,
      user_id: session.user.id,
    },
  ]);

  setTitle("");
  setUrl("");
}

  async function deleteBookmark(id: string) {
    await supabase.from("bookmarks").delete().eq("id", id);
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({ provider: "google" })
          }
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">My Bookmarks</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-red-500"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="border p-2 w-full"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={addBookmark}
          className="bg-blue-500 text-white px-4"
        >
          Add
        </button>
      </div>

      <div className="space-y-3">
        {bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="border p-3 flex justify-between"
          >
            <a
              href={bookmark.url}
              target="_blank"
              className="text-blue-600"
            >
              {bookmark.title}
            </a>
            <button
              onClick={() => deleteBookmark(bookmark.id)}
              className="text-red-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
