import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { VideoPlayer } from 'expo-video';
import { api, put, sessionStore } from '../services/api';
import { WatchProgress } from '../types';
import { useApp } from './AppContext';

/** Restore once; save periodically, on pause/background and before leaving the player. */
export function useWatchProgress(player: VideoPlayer, videoId: string) {
  const { user, refreshHistory } = useApp();
  const [resumeFrom, setResumeFrom] = useState(0);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let loaded = false;
    let restored = false;
    let saved: WatchProgress = { position: 0, duration: 0 };
    let latest: WatchProgress = { position: 0, duration: 0 };
    let lastQueued = '';
    let lastSaveAt = Date.now();
    let queue = Promise.resolve();
    const sessionRevision = sessionStore.revision;
    player.pause();
    player.timeUpdateEventInterval = 1;

    function snapshot() {
      try {
        if (restored && player.duration > 0)
          latest = {
            position: Math.max(0, Math.min(player.currentTime, player.duration)),
            duration: player.duration,
          };
      } catch {
        /* Player may already be disposed during native unmount. */
      }
      return { ...latest };
    }

    function save() {
      const progress = snapshot();
      if (
        !restored ||
        progress.position < 0.5 ||
        !Number.isFinite(progress.duration) ||
        progress.duration <= 0
      )
        return;
      const key = `${progress.position.toFixed(1)}:${progress.duration.toFixed(1)}`;
      if (key === lastQueued) return;
      lastQueued = key;
      lastSaveAt = Date.now();
      // Serialize writes so a slower periodic request cannot overwrite the closing position.
      queue = queue.then(async () => {
        if (sessionRevision !== sessionStore.revision) return;
        try {
          await put(`/videos/${videoId}/progress`, progress);
          refreshHistory();
          if (active) setSyncError(false);
        } catch {
          lastQueued = '';
          if (active) setSyncError(true);
        }
      });
    }

    function restore(status = player.status) {
      if (!active || !loaded || restored || status !== 'readyToPlay') return;
      restored = true;
      // Finished videos start again; partial watches resume at the last saved second.
      if (
        saved.position >= 0.5 &&
        saved.position / saved.duration < 0.95 &&
        saved.position < player.duration
      ) {
        player.currentTime = saved.position;
        setResumeFrom(saved.position);
      }
      latest = { position: player.currentTime, duration: player.duration };
      // Keep native playback controls in charge; restoring a timestamp does not autoplay.
    }

    const ready = player.addListener('statusChange', (event) => restore(event.status));
    const time = player.addListener('timeUpdate', () => {
      snapshot();
      if (Date.now() - lastSaveAt >= 5000) save();
    });
    const paused = player.addListener('playingChange', (event) => {
      if (!event.isPlaying) save();
    });
    const background = AppState.addEventListener('change', (state) => {
      if (state !== 'active') save();
    });
    api<WatchProgress>(`/videos/${videoId}/progress`)
      .then((progress) => {
        saved = progress;
      })
      .catch(() => {
        if (active) setSyncError(true);
      })
      .finally(() => {
        loaded = true;
        restore();
      });

    return () => {
      save();
      active = false;
      try {
        player.timeUpdateEventInterval = 0;
      } catch {
        /* Already disposed. */
      }
      ready.remove();
      time.remove();
      paused.remove();
      background.remove();
    };
  }, [player, videoId, user?.id, refreshHistory]);

  return { resumeFrom, syncError };
}
