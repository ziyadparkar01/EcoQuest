import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Sliders,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkles,
  ListMusic,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ambientAudioService,
  SoundtrackTrack,
  AudioEngineState,
} from '../services/ambientAudioService';
import { AddMusicModal } from './AddMusicModal';
import { hapticFeedback } from '../utils/haptics';

interface SoothingSoundtrackHUDProps {
  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SoothingSoundtrackHUD: React.FC<SoothingSoundtrackHUDProps> = ({
  className = '',
}) => {
  const [audioState, setAudioState] = useState<AudioEngineState>(() =>
    ambientAudioService.getState()
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const unsub = ambientAudioService.subscribe((s) => setAudioState(s));
    return () => unsub();
  }, []);

  const handleTogglePlay = () => {
    hapticFeedback.tactileClick();
    ambientAudioService.togglePlay();
  };

  const handleToggleMute = () => {
    hapticFeedback.tactileClick();
    ambientAudioService.toggleMute();
  };

  const handleNext = () => {
    hapticFeedback.tactileClick();
    ambientAudioService.nextTrack();
  };

  const handlePrev = () => {
    hapticFeedback.tactileClick();
    ambientAudioService.prevTrack();
  };

  const handleSelectTrack = (index: number) => {
    hapticFeedback.tactileClick();
    ambientAudioService.selectTrack(index);
  };

  const handleRemoveTrack = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    hapticFeedback.tactileClick();
    await ambientAudioService.removeCustomTrack(trackId);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    ambientAudioService.setVolume(vol);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = parseFloat(e.target.value);
    ambientAudioService.seek(ratio);
  };

  const progressRatio =
    audioState.duration > 0 ? audioState.currentTime / audioState.duration : 0;

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Mobile Compact Capsule (< md) */}
        <div className="flex md:hidden items-center gap-1.5 bg-stone-900/95 text-stone-100 backdrop-blur-md px-2 py-1.5 rounded-xl border border-stone-700/60 shadow-xs text-xs font-mono">
          <button
            onClick={handleTogglePlay}
            title={audioState.isPlaying ? 'Pause Background Music' : 'Play Background Music'}
            className="w-7 h-7 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            {audioState.isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              hapticFeedback.tactileClick();
              setIsAddModalOpen(true);
            }}
            title="Upload or Add Custom Music"
            className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-400 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              hapticFeedback.tactileClick();
              setIsOpen(!isOpen);
            }}
            title="Soundtrack Playlist & Volume"
            className={`px-1.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'text-stone-300 hover:text-white'
            }`}
          >
            {audioState.isMuted || audioState.volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-stone-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <ListMusic className="w-3 h-3 text-stone-400" />
          </button>
        </div>

        {/* Desktop Full Capsule (md and up) */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 bg-stone-900/95 text-stone-100 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-full border border-stone-700/60 shadow-lg text-xs font-mono">
          {/* Play/Pause Button */}
          <button
            onClick={handleTogglePlay}
            title={audioState.isPlaying ? 'Pause Background Music' : 'Play Background Music'}
            className="p-1 rounded-full bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 transition-colors cursor-pointer"
          >
            {audioState.isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* Previous / Next Track (only if multiple tracks exist) */}
          {audioState.playlist.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                title="Previous Track"
                className="p-0.5 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer hidden xs:inline"
              >
                <SkipBack className="w-3 h-3" />
              </button>
              <button
                onClick={handleNext}
                title="Next Track"
                className="p-0.5 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer hidden xs:inline"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </>
          )}

          {/* Live Audio Visualizer Waves */}
          <div className="flex items-center gap-0.5 h-3.5 px-0.5">
            {[40, 75, 100, 60, 30].map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-all duration-300 ${
                  audioState.isPlaying && !audioState.isMuted
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-stone-600 h-1'
                }`}
                style={{
                  height:
                    audioState.isPlaying && !audioState.isMuted
                      ? `${Math.max(4, (h * audioState.volume) / 6)}px`
                      : '3px',
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>

          {/* Current Track Info */}
          <div
            onClick={() => {
              hapticFeedback.tactileClick();
              setIsOpen(!isOpen);
            }}
            className="cursor-pointer flex items-center gap-1.5 hover:text-emerald-300 transition-colors"
            title="Click to view playlist & controls"
          >
            <span className="text-[11px] font-bold text-stone-200 max-w-[110px] sm:max-w-[140px] truncate">
              {audioState.currentTrack.title}
            </span>
            <span className="text-[10px] text-stone-400 hidden lg:inline">
              ({audioState.currentTrack.mood})
            </span>
          </div>

          {/* Quick Add Music Button */}
          <button
            onClick={() => {
              hapticFeedback.tactileClick();
              setIsAddModalOpen(true);
            }}
            title="Add Custom Music / Upload Track"
            className="px-2 py-0.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span className="hidden xl:inline">ADD MUSIC</span>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={handleToggleMute}
            title={audioState.isMuted ? 'Unmute' : 'Mute'}
            className="p-1 hover:text-emerald-300 text-stone-400 transition-colors cursor-pointer"
          >
            {audioState.isMuted || audioState.volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-stone-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* Open Playlist Drawer */}
          <button
            onClick={() => {
              hapticFeedback.tactileClick();
              setIsOpen(!isOpen);
            }}
            title="Soundtrack Playlist"
            className={`p-1 rounded transition-colors cursor-pointer ${
              isOpen ? 'text-emerald-300 bg-stone-800' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Backdrop for outside click dismissal */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:bg-transparent"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Expanded Playlist & Volume Popover */}
        {isOpen && (
          <div className="fixed top-16 left-3 right-3 max-w-[360px] mx-auto md:absolute md:top-full md:mt-2 md:right-0 md:left-auto md:w-88 p-3.5 sm:p-4 bg-stone-900/98 backdrop-blur-xl rounded-2xl border border-stone-700/80 shadow-2xl text-stone-100 text-xs font-mono z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-stone-200 tracking-wide uppercase">
                    BACKGROUND SOUNDTRACK
                  </div>
                  <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>STEREO AMBIENCE &middot; {audioState.playlist.length} TRACKS</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    hapticFeedback.tactileClick();
                    setIsAddModalOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Upload / Add Music Track"
                >
                  <Plus className="w-3 h-3" />
                  <span>ADD MUSIC</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Playlist"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Playback Bar inside popover */}
            <div className="p-2.5 mb-3 bg-stone-800/70 rounded-xl border border-stone-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] text-stone-400 uppercase font-semibold flex items-center gap-1.5">
                    <span>NOW PLAYING</span>
                    {audioState.currentTrack.isCustom && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 text-[9px] font-bold">
                        CUSTOM
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-300 truncate">
                    {audioState.currentTrack.title}
                  </div>
                  <div className="text-[10px] text-stone-400 truncate">
                    {audioState.currentTrack.artist}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {audioState.playlist.length > 1 && (
                    <button
                      onClick={handlePrev}
                      title="Previous Track"
                      className="p-1 rounded-lg hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={handleTogglePlay}
                    title={audioState.isPlaying ? 'Pause' : 'Play'}
                    className="w-7 h-7 rounded-lg bg-emerald-500 text-stone-950 font-bold flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                  >
                    {audioState.isPlaying ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                    )}
                  </button>
                  {audioState.playlist.length > 1 && (
                    <button
                      onClick={handleNext}
                      title="Next Track"
                      className="p-1 rounded-lg hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrubber progress bar for recorded tracks */}
              {audioState.duration > 0 && (
                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.005"
                    value={progressRatio}
                    onChange={handleSeek}
                    className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>{formatTime(audioState.currentTime)}</span>
                    <span>{formatTime(audioState.duration)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Track Selection List */}
            <div className="space-y-1.5 mb-3 max-h-56 overflow-y-auto pr-0.5">
              {audioState.playlist.map((track, idx) => {
                const isCurrent = audioState.currentTrackIndex === idx;
                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrack(idx)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer border group ${
                      isCurrent
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'bg-stone-800/60 hover:bg-stone-800 text-stone-300 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {/* Track Status / Index Column */}
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-stone-900/60 text-[10px] font-mono">
                      {isCurrent && audioState.isPlaying ? (
                        <span className="flex items-center gap-0.5 h-3">
                          <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
                          <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-75" />
                          <span className="w-0.5 h-2.5 bg-emerald-400 animate-pulse delay-150" />
                        </span>
                      ) : isCurrent ? (
                        <span className="text-emerald-400 font-bold">▶</span>
                      ) : (
                        <span className="text-stone-500 font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Title and Artist Info */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="font-bold text-[11px] truncate leading-tight flex items-center gap-1.5">
                        <span className="truncate">{track.title}</span>
                        {track.isCustom && (
                          <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-mono shrink-0">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate mt-0.5">
                        {track.artist}
                      </div>
                    </div>

                    {/* Mood Tag */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-mono shrink-0 font-medium ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {track.mood.split(' ')[0]}
                    </span>

                    {/* Delete Custom Track Button */}
                    {track.isCustom && (
                      <button
                        onClick={(e) => handleRemoveTrack(e, track.id)}
                        title="Delete custom track"
                        className="opacity-60 hover:opacity-100 p-1 rounded hover:bg-rose-950/80 text-rose-400 transition-opacity cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Track Action Bar */}
            <div className="mb-3">
              <button
                onClick={() => {
                  hapticFeedback.tactileClick();
                  setIsAddModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-dashed border-stone-700 hover:border-emerald-500/60 text-stone-300 hover:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Your Own Background Music Track</span>
              </button>
            </div>

            {/* Master Volume Slider */}
            <div className="pt-2.5 border-t border-stone-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-stone-300 font-semibold">
                <span className="flex items-center gap-1.5 text-stone-400">
                  <Sliders className="w-3 h-3 text-emerald-400" />
                  <span>BGM Volume</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {audioState.isMuted ? 'MUTED' : `${Math.round(audioState.volume * 100)}%`}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleToggleMute}
                  title={audioState.isMuted ? 'Unmute' : 'Mute'}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {audioState.isMuted || audioState.volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-stone-500" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioState.isMuted ? 0 : audioState.volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-stone-700/80 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Music Modal Dialog */}
      <AddMusicModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
};
