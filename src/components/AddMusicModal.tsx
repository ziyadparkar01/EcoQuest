import React, { useState, useRef } from 'react';
import {
  Upload,
  Music,
  Link,
  Plus,
  X,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sparkles,
} from 'lucide-react';
import { ambientAudioService } from '../services/ambientAudioService';
import { hapticFeedback } from '../utils/haptics';

interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMusicModal: React.FC<AddMusicModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileArtist, setFileArtist] = useState('');

  const [urlTitle, setUrlTitle] = useState('');
  const [urlArtist, setUrlArtist] = useState('');
  const [streamUrl, setStreamUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) {
        processSelectedFile(file);
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Please choose an audio file (.mp3, .wav, .ogg, .m4a, .aac, .flac)',
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setStatusMessage(null);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setFileTitle(cleanTitle);
    setFileArtist('Custom Explorer');
  };

  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      hapticFeedback.tactileClick();
      await ambientAudioService.addCustomFileTrack(
        selectedFile,
        fileTitle.trim() || undefined,
        fileArtist.trim() || undefined
      );

      setStatusMessage({
        type: 'success',
        text: `"${fileTitle || selectedFile.name}" added and set as background music!`,
      });

      setTimeout(() => {
        onClose();
        setSelectedFile(null);
        setFileTitle('');
        setFileArtist('');
        setStatusMessage(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to add custom track:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save audio file. Please try another track.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrl.trim()) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      hapticFeedback.tactileClick();
      await ambientAudioService.addCustomUrlTrack(
        urlTitle.trim() || 'Online Soundtrack',
        urlArtist.trim() || 'Web Audio Stream',
        streamUrl.trim()
      );

      setStatusMessage({
        type: 'success',
        text: `Track added and playing as background music!`,
      });

      setTimeout(() => {
        onClose();
        setStreamUrl('');
        setUrlTitle('');
        setUrlArtist('');
        setStatusMessage(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to add stream track:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to add stream. Verify that the URL is a direct audio link.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 text-stone-100 font-mono relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 font-display flex items-center gap-2">
                Add Background Music
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  EXPEDITION BGM
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Upload your favorite music track or stream URL to accompany your expedition.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              hapticFeedback.tactileClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-stone-950 rounded-xl my-4 border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => {
              hapticFeedback.tactileClick();
              setActiveTab('upload');
            }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-emerald-500 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Audio File</span>
          </button>
          <button
            type="button"
            onClick={() => {
              hapticFeedback.tactileClick();
              setActiveTab('url');
            }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-emerald-500 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Audio URL / Stream</span>
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                : 'bg-rose-950/60 border-rose-600/60 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Upload File Tab */}
        {activeTab === 'upload' && (
          <form onSubmit={handleSubmitFile} className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              onChange={handleFileChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/20'
                    : 'border-stone-700 hover:border-emerald-500/60 bg-stone-950/50 hover:bg-stone-950/80'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-stone-800 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-sm font-bold text-stone-200 mb-1">
                  Click to select audio or drag & drop here
                </div>
                <div className="text-xs text-stone-400 mb-2">
                  Supports MP3, WAV, OGG, M4A, FLAC, AAC
                </div>
                <div className="inline-block px-2.5 py-1 rounded-full bg-stone-800 text-[10px] text-stone-400 font-mono">
                  Saved securely in your browser & persists offline
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-emerald-300 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &middot; Audio Track
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">Track Title</label>
                  <input
                    type="text"
                    value={fileTitle}
                    onChange={(e) => setFileTitle(e.target.value)}
                    placeholder="e.g. Peaceful Valley Echo"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">Artist / Note (optional)</label>
                  <input
                    type="text"
                    value={fileArtist}
                    onChange={(e) => setFileArtist(e.target.value)}
                    placeholder="e.g. Favorite Nature Tune"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-emerald-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isLoading ? 'Loading Track...' : 'Set as Only Game Music (Exact File, No Change)'}</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* Add URL Stream Tab */}
        {activeTab === 'url' && (
          <form onSubmit={handleSubmitUrl} className="space-y-3">
            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Audio Stream / MP3 URL</label>
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://example.com/soundtrack.mp3"
                className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-emerald-500 outline-none"
                required
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Enter a direct link to an MP3, OGG, or AAC stream.
              </p>
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Track Title</label>
              <input
                type="text"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="e.g. Lo-Fi Ambient Stream"
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Artist / Source</label>
              <input
                type="text"
                value={urlArtist}
                onChange={(e) => setUrlArtist(e.target.value)}
                placeholder="e.g. Web Radio"
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !streamUrl.trim()}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Connecting...' : 'Add & Play Background Music'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
