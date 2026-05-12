import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  usePlaylists,
  useSyncPlaylist,
  useSetActivePlaylist,
  useDeletePlaylist,
} from "../../features/playlist/usePlaylists";
import { Button } from "../../components/ui/Button";
import { vodApi, type EnrichmentReport, type Playlist } from "../../lib/tauri";
import { t, tFmt } from "../../lib/i18n";

export default function PlaylistsSettings() {
  const { data: playlists = [], isLoading } = usePlaylists();
  const navigate = useNavigate();

  // Open the OS file picker, then hand the selected path to onboarding's
  // pre-fill flow (the M3U form there already accepts file:// + raw paths
  // and `add_m3u_playlist` reads the file directly via `fetch_and_parse`).
  const pickFile = async () => {
    const selected = await openDialog({
      multiple: false,
      directory: false,
      filters: [
        { name: "M3U Playlist", extensions: ["m3u", "m3u8"] },
      ],
      title: t("settings.playlists.dialog_title"),
    });
    if (typeof selected === "string" && selected.length > 0) {
      navigate(`/onboarding?file=${encodeURIComponent(selected)}`);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <span className="meta-caps">{t("settings.playlists.eyebrow")}</span>
      <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 24px" }}>
        {t("settings.playlists.title")}
      </h1>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <Button onClick={() => navigate("/onboarding")}>
          {t("settings.playlists.add_new")}
        </Button>
        <Button variant="ghost" onClick={pickFile}>
          {t("settings.playlists.add_from_file")}
        </Button>
      </div>

      {isLoading && (
        <div style={{ color: "var(--text-3)", padding: "16px 0" }}>
          {t("common.loading")}
        </div>
      )}

      {!isLoading && playlists.length === 0 && (
        <div
          style={{
            padding: 24,
            border: "1px dashed var(--border)",
            borderRadius: 12,
            color: "var(--text-3)",
          }}
        >
          {t("settings.playlists.empty")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {playlists.map((p) => (
          <PlaylistRow key={p.id} playlist={p} />
        ))}
      </div>
    </div>
  );
}

function PlaylistRow({ playlist }: { playlist: Playlist }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const sync = useSyncPlaylist();
  const setActive = useSetActivePlaylist();
  const remove = useDeletePlaylist();
  const enrich = useMutation<EnrichmentReport, Error, number>({
    mutationFn: (id: number) => vodApi.enrichPosters(id),
  });

  const lastSync =
    playlist.lastSyncedAt > 0
      ? new Date(playlist.lastSyncedAt).toLocaleString("tr-TR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : t("settings.playlists.last_sync_never");

  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 12,
        background: "var(--bg-elev)",
        border: `1px solid ${playlist.isActive ? "var(--accent)" : "var(--border)"}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{playlist.name}</span>
            {playlist.isActive && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
                  background: "color-mix(in oklab, var(--accent) 8%, transparent)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {t("settings.playlists.row_active")}
              </span>
            )}
            <span
              className="meta-caps"
              style={{ fontSize: 9.5, color: "var(--text-3)" }}
            >
              {playlist.type}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {playlist.url}
          </span>
          <span className="meta-caps" style={{ fontSize: 9.5 }}>
            {playlist.channelCount.toLocaleString("tr-TR")} kanal · son sync {lastSync}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!playlist.isActive && (
          <Button
            variant="ghost"
            onClick={() => setActive.mutate(playlist.id)}
            disabled={setActive.isPending}
          >
            {t("settings.playlists.btn_activate")}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => sync.mutate(playlist.id)}
          disabled={sync.isPending}
        >
          {sync.isPending && sync.variables === playlist.id
            ? t("settings.playlists.btn_syncing")
            : t("settings.playlists.btn_sync")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => enrich.mutate(playlist.id)}
          disabled={enrich.isPending}
          title={t("settings.playlists.btn_enrich_tooltip")}
        >
          {enrich.isPending
            ? t("settings.playlists.btn_enriching")
            : t("settings.playlists.btn_enrich")}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (confirmingDelete) {
              remove.mutate(playlist.id);
              setConfirmingDelete(false);
            } else {
              setConfirmingDelete(true);
            }
          }}
          disabled={remove.isPending}
        >
          {confirmingDelete
            ? t("common.confirm_delete")
            : t("common.delete")}
        </Button>
      </div>

      {enrich.data && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: enrich.data.skippedDisabled
              ? "var(--bg-elev2)"
              : "color-mix(in oklab, var(--accent) 8%, transparent)",
            border: `1px solid ${
              enrich.data.skippedDisabled
                ? "var(--border)"
                : "color-mix(in oklab, var(--accent) 30%, transparent)"
            }`,
            color: enrich.data.skippedDisabled ? "var(--text-3)" : "var(--text-2)",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {enrich.data.skippedDisabled
            ? t("settings.playlists.tmdb_disabled")
            : tFmt("settings.playlists.enrich_summary", {
                movies: enrich.data.moviesEnriched,
                moviesTotal: enrich.data.moviesSeen,
                series: enrich.data.seriesEnriched,
                seriesTotal: enrich.data.seriesSeen,
              })}
        </div>
      )}

      {(sync.error || remove.error || setActive.error || enrich.error) && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "color-mix(in oklab, #E07A6F 12%, transparent)",
            border: "1px solid color-mix(in oklab, #E07A6F 30%, transparent)",
            color: "#E07A6F",
            fontSize: 12,
          }}
        >
          {sync.error?.message ||
            remove.error?.message ||
            setActive.error?.message ||
            enrich.error?.message}
        </div>
      )}
    </div>
  );
}
