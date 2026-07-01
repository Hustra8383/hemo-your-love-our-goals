import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadTo, useSignedUrl } from "@/lib/signed-url";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Empty } from "@/components/hemo/Empty";
import { Camera, Image as ImageIcon, Heart, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/app/memories")({
  head: () => ({ meta: [{ title: "Memories — HEMO" }] }),
  component: Page,
});

type Memory = {
  id: string;
  couple_id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  favorite: boolean;
  created_at: string;
};

function Page() {
  const { user, couple } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<Memory | null>(null);
  const [filter, setFilter] = useState<"all" | "fav">("all");

  const q = useQuery({
    queryKey: ["memories", couple?.id, filter],
    enabled: !!couple?.id,
    queryFn: async () => {
      let query = supabase.from("memories").select("*").eq("couple_id", couple!.id);
      if (filter === "fav") query = query.eq("favorite", true);
      const { data } = await query.order("created_at", { ascending: false });
      return (data ?? []) as Memory[];
    },
  });

  function pick(source: "camera" | "gallery") {
    (source === "camera" ? cameraRef : fileRef).current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { toast.error("Max 15 MB"); return; }
    setPending(f);
  }

  async function commit() {
    if (!pending || !user || !couple) return;
    setUploading(true);
    try {
      const ext = pending.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = await uploadTo(user.id, "memories", pending, ext);
      const { error } = await supabase.from("memories").insert({
        user_id: user.id,
        couple_id: couple.id,
        image_url: path,
        caption: caption.trim() || null,
      });
      if (error) throw error;
      toast.success("Saved to your memories");
      setPending(null); setCaption("");
      void qc.invalidateQueries({ queryKey: ["memories"] });
      void qc.invalidateQueries({ queryKey: ["latest-memory"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  }

  async function toggleFav(m: Memory) {
    await supabase.from("memories").update({ favorite: !m.favorite }).eq("id", m.id);
    void qc.invalidateQueries({ queryKey: ["memories"] });
  }

  async function remove(m: Memory) {
    if (m.user_id !== user!.id) { toast.error("Only the uploader can delete"); return; }
    await supabase.storage.from("hemo-media").remove([m.image_url]);
    await supabase.from("memories").delete().eq("id", m.id);
    setPreview(null);
    void qc.invalidateQueries({ queryKey: ["memories"] });
  }

  const grouped = groupByDay(q.data ?? []);

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Little frames of your world.</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight">Memories</h1>
        </div>
        <div className="glass rounded-full p-1 text-xs">
          <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1.5 ${filter === "all" ? "gradient-hemo text-white" : ""}`}>All</button>
          <button onClick={() => setFilter("fav")} className={`rounded-full px-3 py-1.5 ${filter === "fav" ? "gradient-hemo text-white" : ""}`}>Favorites</button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 animate-fade-up">
        <button onClick={() => pick("camera")} className="glass flex items-center gap-3 rounded-2xl p-4 active:scale-[0.98] transition">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-her"><Camera className="h-4 w-4" /></span>
          <span className="text-sm font-medium">Camera</span>
        </button>
        <button onClick={() => pick("gallery")} className="glass flex items-center gap-3 rounded-2xl p-4 active:scale-[0.98] transition">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-him text-white"><ImageIcon className="h-4 w-4" /></span>
          <span className="text-sm font-medium">Gallery</span>
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </section>

      {q.isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !q.data?.length ? (
        <Empty icon={ImageIcon} title="No memories yet" hint="Snap a photo — even the small ones matter." />
      ) : (
        <div className="space-y-5 animate-fade-up">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="px-1 pb-2 text-xs uppercase tracking-wider text-muted-foreground">{day}</p>
              <div className="grid grid-cols-2 gap-3">
                {items.map((m) => <Tile key={m.id} m={m} onOpen={() => setPreview(m)} onFav={() => toggleFav(m)} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caption sheet */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => !uploading && setPending(null)}>
          <div className="glass-strong m-3 w-full max-w-md rounded-3xl p-5 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <img src={URL.createObjectURL(pending)} alt="" className="h-full w-full object-cover" />
            </div>
            <textarea
              value={caption} onChange={(e) => setCaption(e.target.value)}
              maxLength={200} placeholder="Say something about this moment…"
              className="mt-3 w-full resize-none rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setPending(null)} disabled={uploading} className="flex-1 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">Cancel</button>
              <button onClick={commit} disabled={uploading} className="flex-1 rounded-2xl gradient-hemo px-4 py-3 text-sm font-medium text-white">
                {uploading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save memory"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen preview */}
      {preview && <Lightbox m={preview} onClose={() => setPreview(null)} onFav={() => toggleFav(preview)} onDelete={() => remove(preview)} />}
    </div>
  );
}

function Tile({ m, onOpen, onFav }: { m: Memory; onOpen: () => void; onFav: () => void }) {
  const { data: url } = useSignedUrl(m.image_url);
  return (
    <div className="group relative">
      <button onClick={onOpen} className="block aspect-square w-full overflow-hidden rounded-2xl glass">
        {url ? <img src={url} alt={m.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="h-full w-full animate-pulse bg-secondary" />}
      </button>
      <button onClick={onFav} className={`absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full backdrop-blur ${m.favorite ? "bg-destructive/90 text-white" : "bg-black/30 text-white"}`}>
        <Heart className="h-3.5 w-3.5" fill={m.favorite ? "currentColor" : "none"} />
      </button>
      {m.caption && <p className="mt-1.5 line-clamp-2 px-1 text-xs text-muted-foreground">{m.caption}</p>}
    </div>
  );
}

function Lightbox({ m, onClose, onFav, onDelete }: { m: Memory; onClose: () => void; onFav: () => void; onDelete: () => void }) {
  const { data: url } = useSignedUrl(m.image_url);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onFav(); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">
          <Heart className="h-4 w-4" fill={m.favorite ? "currentColor" : "none"} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex h-full flex-col items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {url && <img src={url} alt={m.caption ?? ""} className="max-h-[80vh] max-w-full rounded-2xl object-contain" />}
        {m.caption && <p className="mt-4 max-w-md text-center text-sm text-white/80">{m.caption}</p>}
        <p className="mt-2 text-xs text-white/50">{format(new Date(m.created_at), "MMM d, yyyy · h:mm a")}</p>
      </div>
    </div>
  );
}

function groupByDay(items: Memory[]): [string, Memory[]][] {
  const map = new Map<string, Memory[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const m of items) {
    const d = new Date(m.created_at);
    const key = d.toDateString() === today ? "Today" : d.toDateString() === yesterday ? "Yesterday" : format(d, "EEEE, MMM d");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries());
}
