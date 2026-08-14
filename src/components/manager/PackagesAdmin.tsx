import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { usePackages, type DbPackage, type Rate } from "@/hooks/usePackages";
import { naira } from "@/lib/format";

type Draft = {
  key: string;
  label: string;
  tagline: string;
  includes: string;
  excludes: string;
  day: Rate[];
  night: Rate[];
  active: boolean;
  sort_order: number;
};

const emptyDraft: Draft = {
  key: "",
  label: "",
  tagline: "",
  includes: "",
  excludes: "",
  day: [{ hours: 2, price: 0 }],
  night: [{ hours: 2, price: 0 }],
  active: true,
  sort_order: 0,
};

function toDraft(p: DbPackage): Draft {
  return {
    key: p.key,
    label: p.label,
    tagline: p.tagline,
    includes: p.includes.join("\n"),
    excludes: p.excludes.join("\n"),
    day: p.rates.day.length ? p.rates.day : [{ hours: 2, price: 0 }],
    night: p.rates.night.length ? p.rates.night : [{ hours: 2, price: 0 }],
    active: p.active,
    sort_order: p.sort_order,
  };
}

function lines(v: string) {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function RateEditor({
  title,
  rates,
  onChange,
}: {
  title: string;
  rates: Rate[];
  onChange: (r: Rate[]) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{title}</p>
      <div className="mt-2 space-y-2">
        {rates.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              className="w-20"
              value={r.hours}
              onChange={(e) =>
                onChange(rates.map((x, j) => (j === i ? { ...x, hours: Number(e.target.value) } : x)))
              }
            />
            <span className="text-xs text-muted-foreground">hrs</span>
            <Input
              type="number"
              min={0}
              step={1000}
              value={r.price}
              onChange={(e) =>
                onChange(rates.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(rates.filter((_, j) => j !== i))}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => onChange([...rates, { hours: 2, price: 0 }])}
      >
        Add tier
      </Button>
    </div>
  );
}

function PackageForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Key (unique slug)</Label>
          <Input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Tagline</Label>
        <Input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Includes (one per line)</Label>
          <Textarea
            rows={4}
            value={draft.includes}
            onChange={(e) => setDraft({ ...draft, includes: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Excludes / notes (one per line)</Label>
          <Textarea
            rows={4}
            value={draft.excludes}
            onChange={(e) => setDraft({ ...draft, excludes: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RateEditor title="day" rates={draft.day} onChange={(day) => setDraft({ ...draft, day })} />
        <RateEditor title="night" rates={draft.night} onChange={(night) => setDraft({ ...draft, night })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Sort order</Label>
          <Input
            type="number"
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving}>
          Save package
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function PackagesAdmin() {
  const qc = useQueryClient();
  const { data: packages = [], isLoading } = usePackages(false);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["packages"] });

  const payload = (d: Draft) => ({
    key: d.key.trim(),
    label: d.label.trim(),
    tagline: d.tagline.trim(),
    includes: lines(d.includes),
    excludes: lines(d.excludes),
    rates: { day: d.day, night: d.night },
    active: d.active,
    sort_order: d.sort_order,
  });

  const create = async () => {
    if (!newDraft.key.trim() || !newDraft.label.trim()) {
      toast.error("Key and label are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("packages").insert(payload(newDraft));
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Package added.");
    setNewDraft(emptyDraft);
    setCreating(false);
    refresh();
  };

  const save = async (id: string) => {
    if (!editDraft.key.trim() || !editDraft.label.trim()) {
      toast.error("Key and label are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("packages").update(payload(editDraft)).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Package updated.");
    setEditingId(null);
    refresh();
  };

  const toggle = async (p: DbPackage) => {
    const { error } = await supabase.from("packages").update({ active: !p.active }).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Package deleted.");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">Packages</h2>
          <Button size="sm" onClick={() => setCreating((v) => !v)}>
            {creating ? "Close" : "New package"}
          </Button>
        </div>
        {creating && (
          <div className="mt-4">
            <PackageForm draft={newDraft} setDraft={setNewDraft} onSave={create} saving={saving} />
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading packages…</p>}

      {packages.map((p) => (
        <article key={p.id} className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl">{p.label}</h3>
              <p className="text-sm text-muted-foreground">{p.tagline}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(editingId === p.id ? null : p.id);
                  setEditDraft(toDraft(p));
                }}
              >
                {editingId === p.id ? "Close" : "Edit"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void toggle(p)}>
                {p.active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void remove(p.id)}>
                Delete
              </Button>
            </div>
          </div>

          {editingId === p.id ? (
            <div className="mt-4">
              <PackageForm
                draft={editDraft}
                setDraft={setEditDraft}
                onSave={() => void save(p.id)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(["day", "night"] as const).map((period) => (
                <div key={period} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {period}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {p.rates[period].map((r) => (
                      <li key={r.hours} className="flex justify-between">
                        <span className="text-muted-foreground">{r.hours}hrs</span>
                        <span className="font-semibold">{naira(r.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
