import React, { useState, useEffect } from 'react';
import { CharacterCanvas } from './components/CharacterCanvas';
import { MissionHUD } from './components/MissionHUD';
import { DailyChallengesView } from './components/DailyChallengesView';
import { StickerAlbumView } from './components/StickerAlbumView';
import { PocketModeHUD } from './components/PocketModeHUD';
import { NatureTopoBackground } from './components/NatureTopoBackground';
import { WelcomeIntroOverlay } from './components/WelcomeIntroOverlay';
import { StickerEntry } from './components/StickerBookModal';
import { BioCardsDeck } from './components/BioCardsDeck';
import { ArchitectureBlueprint } from './components/ArchitectureBlueprint';
import { TacticalGoogleMap } from './components/TacticalGoogleMap';
import { SoothingSoundtrackHUD } from './components/SoothingSoundtrackHUD';
import { AddMusicModal } from './components/AddMusicModal';
import { VoiceApiKeyModal } from './components/VoiceApiKeyModal';
import { ComponentErrorBoundary } from './components/ErrorBoundary';
import { CharacterGender, GamePage, LocalityWaypoint } from './types';
import { hapticFeedback } from './utils/haptics';
import { ambientAudioService, AudioEngineState } from './services/ambientAudioService';
import {
  movementTrackingService,
  MovementTelemetry,
} from './services/movementTrackingService';
import {
  DailyNatureChallenge,
  fetchDailyNatureChallenges
} from './services/geminiMissionService';
import {
  voiceAssistantService,
  VoiceAssistantState,
} from './services/voiceAssistantService';
import { getCurrentGreeting } from './utils/timeGreeting';
import {
  ArrowRight,
  Smartphone,
  X,
  Compass,
  RotateCcw,
  Headphones,
  Sparkles,
  Award,
  BookOpen,
  Calendar,
  MapPin,
  LocateFixed,
  Radio,
  Layers,
  Cpu,
  Sunrise,
  Sunset,
  Sun,
  Moon,
  Volume2,
  User,
  Key,
  Shuffle,
  CheckCircle2,
  Shield,
  Play,
  Pause,
  Music,
  Plus,
  Upload,
  ArrowLeft,
  Mic,
} from 'lucide-react';
import ecoquestTreeLogo from './assets/images/ecoquest_tree_logo_1791715142835.jpg';

const RANDOM_CODENAMES = [
  'Ranger_Oak',
  'Flora_Scout',
  'Cedar_Tracker',
  'Moss_Fox',
  'Solar_Strider',
  'River_Falcon',
  'Canopy_Hawk',
  'Terra_Seeker',
  'Alpine_Wolf',
  'Breeze_Scout',
];

export default function App() {
  // Navigation & Page State (Welcome, Character, Mission, Daily Challenges, Stickers, Bio Cards, Blueprint)
  const [currentPage, setCurrentPage] = useState<GamePage>('welcome');
  const [isPocketModalOpen, setIsPocketModalOpen] = useState(false);
  const [isVoiceKeyModalOpen, setIsVoiceKeyModalOpen] = useState(false);
  const [isAddMusicModalOpen, setIsAddMusicModalOpen] = useState(false);

  // Background Music Soundtrack State
  const [audioState, setAudioState] = useState<AudioEngineState>(() =>
    ambientAudioService.getState()
  );

  useEffect(() => {
    const unsubAudio = ambientAudioService.subscribe((s) => setAudioState(s));
    ambientAudioService.start().catch(() => {});
    return () => unsubAudio();
  }, []);

  // Aura Voice Assistant State for floating dock and mobile trigger
  const [voiceState, setVoiceState] = useState<VoiceAssistantState>(() =>
    voiceAssistantService.getState()
  );

  useEffect(() => {
    const unsubVoice = voiceAssistantService.subscribe((s) => setVoiceState(s));
    return () => unsubVoice();
  }, []);

  // Real-time GPS movement telemetry
  const [telemetry, setTelemetry] = useState<MovementTelemetry>(
    movementTrackingService.getTelemetry()
  );

  useEffect(() => {
    const unsub = movementTrackingService.subscribe((t) => {
      setTelemetry(t);
    });
    return () => unsub();
  }, []);

  // Waypoints for full-screen Tactical Google Map
  const [activeMapWaypoint, setActiveMapWaypoint] = useState<LocalityWaypoint | null>(null);
  const appWaypoints: LocalityWaypoint[] = React.useMemo(() => [
    {
      id: 'wp-app-1',
      name: 'Broad Fallen Leaves Cache',
      category: 'Botanical',
      description: 'Look beneath shaded oak or maple canopy for broad fallen leaves.',
      audioPrompt: 'Find two broad fallen leaves on the ground for your craft dragon wings.',
      lat: (telemetry.latitude || 37.7749) + 0.0006,
      lng: (telemetry.longitude || -122.4194) + 0.0008,
      icon: '🍃',
      completed: false,
      distanceMeters: 75,
    },
    {
      id: 'wp-app-2',
      name: 'Curved Twig Haven',
      category: 'Canopy',
      description: 'Search near fallen branches for a sturdy, curved dry twig.',
      audioPrompt: 'Pick up one curved twig about the length of your hand for the dragon spine.',
      lat: (telemetry.latitude || 37.7749) - 0.0005,
      lng: (telemetry.longitude || -122.4194) + 0.0007,
      icon: '🪵',
      completed: false,
      distanceMeters: 60,
    },
    {
      id: 'wp-app-3',
      name: 'Polished River Pebbles',
      category: 'Geo',
      description: 'Locate two smooth round pebbles on the path.',
      audioPrompt: 'Gather two smooth pebbles from the soil to serve as glowing dragon eyes.',
      lat: (telemetry.latitude || 37.7749) + 0.0003,
      lng: (telemetry.longitude || -122.4194) - 0.0009,
      icon: '🪨',
      completed: false,
      distanceMeters: 90,
    },
  ], [telemetry.latitude, telemetry.longitude]);

  // Welcome Intro Preloader
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(true);
  const [introAnimated, setIntroAnimated] = useState(false);

  // Character Customization State
  const [selectedGender, setSelectedGender] = useState<CharacterGender>('male');
  const [explorerName, setExplorerName] = useState<string>('Ranger_01');

  const handleRandomizeCodename = () => {
    hapticFeedback.tactileClick();
    const randomIndex = Math.floor(Math.random() * RANDOM_CODENAMES.length);
    setExplorerName(RANDOM_CODENAMES[randomIndex]);
  };

  // Welcome Time-of-Day Dynamic Greeting directly synced with real local time
  const [greetingInfo, setGreetingInfo] = useState(() => getCurrentGreeting());

  useEffect(() => {
    const timer = setInterval(() => {
      setGreetingInfo(getCurrentGreeting());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Gameplay movement state
  const [isWalking, setIsWalking] = useState(false);

  // Progression & Score State
  const [currentLevel, setCurrentLevel] = useState(3);
  const [totalXp, setTotalXp] = useState(850);

  // Daily Nature Challenges State
  const [dailyChallenges, setDailyChallenges] = useState<DailyNatureChallenge[]>([
    {
      id: 'daily-leaf-default',
      title: 'Find 2 Broad Leaves',
      description: 'Scan beneath mature canopy trees for two intact leaves with clear veining.',
      category: 'Flora',
      icon: '🍃',
      difficulty: 'Quick',
      xpReward: 100,
      completed: true,
    },
    {
      id: 'daily-bird-default',
      title: 'Identify a Local Bird',
      description: 'Stop silently for 60 seconds and locate a wild bird in the branches. Note its song.',
      category: 'Fauna',
      icon: '🐦',
      difficulty: 'Explorer',
      xpReward: 150,
      completed: false,
    },
    {
      id: 'daily-bark-default',
      title: 'Inspect Tree Bark Texture',
      description: 'Feel the ridges and fissures of a tree trunk and check for green moss or velvet lichen.',
      category: 'Tactile',
      icon: '🪵',
      difficulty: 'Tracker',
      xpReward: 125,
      completed: false,
    },
  ]);
  const [isFetchingChallenges, setIsFetchingChallenges] = useState(false);

  // Field Sticker Codex State
  const [unlockedStickers, setUnlockedStickers] = useState<StickerEntry[]>([
    {
      id: 'stk-dragon',
      name: 'Verdant Leaf Dragon',
      badgeEmoji: '🐉',
      rarity: 'Mythic',
      category: 'craft',
      biome: 'Oak & Redwood Woodland',
      dateUnlocked: 'Stage 1 Complete',
      lore: 'A gentle woodland guardian crafted on the soil from fallen autumn leaves and river pebbles.',
      ingredients: ['2x Fallen Leaves (Wings)', '1x Curved Twig (Spine)', '2x River Pebbles (Eyes)'],
      xpEarned: 350,
    },
    {
      id: 'stk-turtle',
      name: 'Moss Pebble Turtle',
      badgeEmoji: '🐢',
      rarity: 'Rare',
      category: 'craft',
      biome: 'Riparian Creek',
      dateUnlocked: 'Stage 2 Complete',
      lore: 'Sculpted from river stones and damp moss fronds. Absorbs cool mountain water currents.',
      ingredients: ['1x Flat Palm Stone', '4x Small Pebbles', '1x Moss Frond'],
      xpEarned: 300,
    },
  ]);

  const handleWelcomeComplete = () => {
    setShowWelcomeIntro(false);
    setTimeout(() => {
      setIntroAnimated(true);
    }, 100);
    ambientAudioService.start();
  };

  const handleReplayIntro = () => {
    setIntroAnimated(false);
    setShowWelcomeIntro(true);
  };

  const handleToggleDailyChallenge = (challengeId: string) => {
    setDailyChallenges((prev) =>
      prev.map((c) => {
        if (c.id === challengeId) {
          const nextState = !c.completed;
          if (nextState) {
            hapticFeedback.challengeCompleted();
            setTotalXp((xp) => xp + c.xpReward);
          } else {
            hapticFeedback.tactileClick();
            setTotalXp((xp) => Math.max(0, xp - c.xpReward));
          }
          return { ...c, completed: nextState };
        }
        return c;
      })
    );
  };

  const handleRefreshChallenges = async () => {
    setIsFetchingChallenges(true);
    try {
      const fresh = await fetchDailyNatureChallenges({
        biome: 'Oak Woodland',
        timeOfDay: 'Afternoon',
      });
      setDailyChallenges(fresh);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    } finally {
      setIsFetchingChallenges(false);
    }
  };

  const completedChallengesCount = dailyChallenges.filter((c) => c.completed).length;

  return (
    <div className="relative min-h-screen bg-[#ebeae5] text-stone-900 selection:bg-stone-900 selection:text-stone-50 font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden">
      {/* RICARDO CHANCE STYLE WELCOME PRELOADER */}
      {showWelcomeIntro && (
        <WelcomeIntroOverlay
          onComplete={handleWelcomeComplete}
          appName="ECOQUEST"
          tagline="BIO-ACOUSTIC EXPEDITION ENGINE"
        />
      )}

      {/* NATURE TOPOGRAPHICAL BACKGROUND */}
      <NatureTopoBackground />

      {/* =========================================================================
          TOP BAR: STRICT CLEAN 3-ZONE LAYOUT (BRAND · DESKTOP NAV · ACTION)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#ebeae5]/90 backdrop-blur-md border-b border-stone-300/80 shadow-xs select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Wordmark */}
          <div
            onClick={() => {
              hapticFeedback.tactileClick();
              setCurrentPage('welcome');
            }}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            {/* Celtic Tree of Life Emblem Logo in place of EQ */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-emerald-500/80 shadow-[0_0_14px_rgba(16,185,129,0.4)] group-hover:scale-105 group-hover:border-emerald-400 transition-all shrink-0 bg-stone-950 flex items-center justify-center ring-2 ring-emerald-500/20">
              <img
                src={ecoquestTreeLogo || '/images/ecoquest_logo.jpg'}
                alt="EcoQuest Celtic Tree Emblem"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = '/images/ecoquest_logo.jpg';
                }}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-['Cinzel',serif] font-black text-sm sm:text-base tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-900 via-emerald-700 to-teal-900 drop-shadow-[0_1px_1px_rgba(16,185,129,0.2)] leading-tight group-hover:from-emerald-700 group-hover:to-teal-600 transition-all">
                  ECOQUEST
                </span>
                <span className="text-[10px] text-emerald-600 font-serif opacity-80 select-none">🍃</span>
              </div>
              <span className="text-[7.5px] sm:text-[8.5px] font-mono font-bold text-emerald-800 tracking-[0.18em] uppercase">
                ADVENTURE · NATURE QUEST
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Visible on lg+, 1024px+) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-stone-200/90 rounded-2xl text-xs font-mono border border-stone-300/80 shadow-inner">
            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setCurrentPage('welcome');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'welcome'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-300/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>EXPLORER SETUP</span>
            </button>

            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setCurrentPage('playing');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'playing'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-300/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>MISSION</span>
            </button>

            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setCurrentPage('challenges');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'challenges'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-300/60'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>CHALLENGES</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  currentPage === 'challenges'
                    ? 'bg-emerald-400 text-stone-950'
                    : 'bg-stone-300/90 text-stone-800'
                }`}
              >
                {completedChallengesCount}/{dailyChallenges.length}
              </span>
            </button>

            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setCurrentPage('stickers');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'stickers'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-300/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>STICKERS</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  currentPage === 'stickers'
                    ? 'bg-amber-400 text-stone-950'
                    : 'bg-stone-300/90 text-stone-800'
                }`}
              >
                {unlockedStickers.length}
              </span>
            </button>

            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setCurrentPage('biocards');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'biocards'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-300/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>BIO CARDS</span>
            </button>

            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setCurrentPage('blueprint');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentPage === 'blueprint'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-300/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              <span>BLUEPRINT</span>
            </button>
          </nav>

          {/* Right Utilities (Voice Key + Soundtrack + Intro + Pocket) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Voice API Key Trigger Button */}
            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setIsVoiceKeyModalOpen(true);
              }}
              title="Configure Voice Assistant & ElevenLabs API Key"
              className="h-8 sm:h-9 px-2 sm:px-2.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-mono font-bold rounded-xl transition-colors border border-emerald-700/70 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-[11px]">VOICE KEY</span>
            </button>

            <SoothingSoundtrackHUD />

            <button
              onClick={handleReplayIntro}
              title="Replay Welcome Intro Animation"
              className="h-8 sm:h-9 px-2 sm:px-2.5 bg-stone-200/90 hover:bg-stone-300 text-stone-700 text-xs font-mono font-bold rounded-xl transition-colors border border-stone-300 shadow-xs cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden xl:inline text-[11px]">INTRO</span>
            </button>

            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setIsPocketModalOpen(true);
              }}
              title="Open AMOLED Pocket Mode"
              className="h-8 sm:h-9 px-2.5 sm:px-3 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-mono font-bold rounded-xl transition-colors border-t border-stone-700/40 shadow-xs active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] sm:text-xs">POCKET</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          PAGE 1: WELCOME, ENTER NAME & CHARACTER SELECTION (ALL ON FIRST PAGE)
          ========================================================================= */}
      {currentPage === 'welcome' && (
        <main className="relative z-10 min-h-[calc(100dvh-64px)] flex flex-col justify-between p-3.5 sm:p-5 lg:p-8 pb-28 lg:pb-12 max-w-3xl mx-auto w-full">
          {/* Header Salutation & Celtic Brand Insignia */}
          <div className="text-center space-y-2.5 select-none flex flex-col items-center">
            {/* Celtic Tree of Life Brand Emblem Badge */}
            <div
              className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                introAnimated ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
              }`}
            >
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-emerald-500/90 shadow-[0_0_24px_rgba(16,185,129,0.4)] bg-stone-950 p-0.5 ring-4 ring-emerald-500/25 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={ecoquestTreeLogo || '/images/ecoquest_logo.jpg'}
                    alt="EcoQuest Celtic Tree Emblem"
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = '/images/ecoquest_logo.jpg';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Real-time Dynamic Greeting Pill */}
            <div
              className={`inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 rounded-2xl bg-stone-200/90 border border-stone-300 shadow-xs text-xs font-mono transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                introAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <div className="flex items-center gap-1.5 text-stone-800 font-bold">
                <span className="text-base select-none">{greetingInfo.emoji}</span>
                <span className="tracking-wider uppercase text-[11px] font-bold text-emerald-800">
                  {greetingInfo.salutation}
                </span>
              </div>
              <span className="text-stone-400">·</span>
              <span className="text-stone-800 font-mono text-[11px] font-bold">{greetingInfo.clockTime}</span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-600 font-mono text-[10px]">{greetingInfo.dateLabel}</span>
            </div>

            <div className="overflow-hidden">
              <h1
                className={`text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-stone-900 tracking-tight leading-[1.05] mt-1 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  introAnimated ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                }`}
              >
                Welcome Explorer
              </h1>
            </div>

          </div>

          {/* Central Combined Card: Name Input & 3D Character Selection */}
          <div
            className={`my-3 space-y-4 transition-all duration-700 delay-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              introAnimated ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="rounded-3xl bg-stone-100/95 border border-stone-300/90 p-4 sm:p-6 shadow-[0_6px_0_0_#d6d3d1] space-y-4">
              {/* Header: Explorer Setup */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 text-emerald-400 flex items-center justify-center font-black text-xs shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-stone-900">
                      Explorer Profile & Character
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-mono text-stone-500">
                      Enter your name and select your explorer
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold uppercase">
                  LVL {currentLevel} · READY
                </span>
              </div>

              {/* 1. Name Input with Randomize */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-stone-700 uppercase tracking-wide">
                  Enter Your Name:
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={explorerName}
                    onChange={(e) => setExplorerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        hapticFeedback.startPlaying();
                        if (!explorerName.trim()) setExplorerName('Ranger_01');
                        setCurrentPage('playing');
                        ambientAudioService.start();
                        voiceAssistantService.unlockAudioContext();
                      }
                    }}
                    placeholder="Enter your name (e.g. Ranger_Oak)"
                    className="w-full pl-3.5 pr-24 py-3 rounded-2xl bg-white border border-stone-300 text-stone-900 placeholder-stone-400 font-mono text-sm font-bold shadow-inner outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeCodename}
                    title="Randomize explorer codename"
                    className="absolute right-2 px-2.5 py-1.5 rounded-xl bg-stone-200/90 hover:bg-stone-300 text-stone-700 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-stone-600" />
                    <span className="hidden sm:inline text-[11px]">Random</span>
                  </button>
                </div>
              </div>

              {/* 2. Character Selection Switcher */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-mono font-bold text-stone-700 uppercase tracking-wide">
                  Choose Your Character:
                </label>
                <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-stone-200/80 border border-stone-300 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      hapticFeedback.tactileClick();
                      setSelectedGender('male');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedGender === 'male'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                    }`}
                  >
                    <span>♂</span>
                    <span>Male (Nicolás)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      hapticFeedback.tactileClick();
                      setSelectedGender('female');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedGender === 'female'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                    }`}
                  >
                    <span>♀</span>
                    <span>Female (Michelle)</span>
                  </button>
                </div>
              </div>

              {/* 3. 3D WebGL Character Viewport (Sized for full head-to-toe visibility) */}
              <div className="w-full rounded-2xl overflow-hidden bg-stone-100/90 border border-stone-300/80 shadow-[0_3px_0_0_#d6d3d1] relative">
                <div className="relative w-full h-[400px] sm:h-[460px] md:h-[500px] bg-stone-200/40 overflow-hidden">
                  <ComponentErrorBoundary componentName="3D Ranger">
                    <CharacterCanvas
                      gender={selectedGender}
                      isWalking={isWalking}
                      gamePage="character"
                    />
                  </ComponentErrorBoundary>
                </div>
              </div>

              {/* 4. EXPEDITION BACKGROUND MUSIC QUICK CONTROLLER & CUSTOM TRACK ADDER */}
              <div className="rounded-2xl bg-stone-900 text-stone-100 p-3.5 sm:p-4 border border-stone-800 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <Music className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
                          BACKGROUND MUSIC
                        </span>
                        {audioState.currentTrack.isCustom && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[8px] font-mono font-bold">
                            CUSTOM TRACK
                          </span>
                        )}
                        {audioState.isPlaying && (
                          <span className="flex items-center gap-0.5 h-3 ml-1">
                            <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
                            <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-75" />
                            <span className="w-0.5 h-2.5 bg-emerald-400 animate-pulse delay-150" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-stone-100 truncate">
                        {audioState.currentTrack.title}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-stone-400 truncate">
                        {audioState.currentTrack.artist} &middot; {audioState.currentTrack.mood}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        hapticFeedback.tactileClick();
                        ambientAudioService.togglePlay();
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        audioState.isPlaying
                          ? 'bg-emerald-500 text-stone-950 shadow-xs'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      {audioState.isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>PAUSE BGM</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>PLAY BGM</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        hapticFeedback.tactileClick();
                        if (audioState.playlist.length > 1) {
                          ambientAudioService.nextTrack();
                        } else {
                          ambientAudioService.seek(0);
                        }
                      }}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                      title={audioState.playlist.length > 1 ? "Next track" : "Restart track"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <label
                      title="Select your exact audio file to use as the only game music (no changes, bit-for-bit original)"
                      className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>LOAD YOUR EXACT AUDIO FILE</span>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            hapticFeedback.tactileClick();
                            const file = e.target.files[0];
                            await ambientAudioService.addCustomFileTrack(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        hapticFeedback.tactileClick();
                        setIsAddMusicModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Custom audio settings"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* PRIMARY START MISSION HERO CTA */}
              <button
                onClick={() => {
                  hapticFeedback.startPlaying();
                  if (!explorerName.trim()) setExplorerName('Ranger_01');
                  setCurrentPage('playing');
                  ambientAudioService.start();
                  voiceAssistantService.unlockAudioContext();
                }}
                className="w-full py-4 px-6 bg-stone-900 hover:bg-stone-850 active:bg-stone-900 text-stone-50 font-display font-bold text-base sm:text-lg rounded-2xl transition-all border-t border-stone-600/50 shadow-[0_6px_0_0_#0c0a09] active:shadow-[0_1px_0_0_#0c0a09] active:translate-y-1.5 flex items-center justify-center gap-3 cursor-pointer group"
              >
                <Play className="w-5 h-5 text-emerald-400 fill-emerald-400 group-hover:scale-110 transition-transform" />
                <span>START MISSION · DEPLOY EXPEDITION</span>
                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1.5 transition-transform ml-auto" />
              </button>
            </div>
          </div>

          {/* Quick shortcuts row */}
          <div className="space-y-2">
            <button
              onClick={() => {
                hapticFeedback.tactileClick();
                setCurrentPage('challenges');
              }}
              className="w-full py-2.5 sm:py-3 px-4 bg-stone-200/90 hover:bg-stone-300 text-stone-900 font-mono text-xs font-bold rounded-2xl transition-all border border-stone-300 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>VIEW DAILY NATURE CHALLENGES ({completedChallengesCount}/{dailyChallenges.length})</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  hapticFeedback.tactileClick();
                  voiceAssistantService.unlockAudioContext();
                  setCurrentPage('playing');
                }}
                className="p-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-mono text-[11px] font-bold border border-stone-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>Quick Mission</span>
              </button>

              <button
                onClick={() => {
                  hapticFeedback.tactileClick();
                  setCurrentPage('stickers');
                }}
                className="p-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-mono text-[11px] font-bold border border-stone-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-sky-700" />
                <span>Field Stickers ({unlockedStickers.length})</span>
              </button>

              <button
                onClick={() => {
                  hapticFeedback.tactileClick();
                  setIsVoiceKeyModalOpen(true);
                }}
                className="p-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-mono text-[11px] font-bold border border-stone-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Key className="w-4 h-4 text-emerald-700" />
                <span>Voice Key</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          PAGE 2: PLAYING GAME (MISSION HUD WITH BOTH 3D CHARACTER & GOOGLE MAP)
          ========================================================================= */}
      {currentPage === 'playing' && (
        <main className="relative z-10 min-h-[calc(100vh-64px)] pb-24 lg:pb-10">
          <MissionHUD
            explorerName={explorerName}
            gender={selectedGender}
            isWalking={isWalking}
            setIsWalking={setIsWalking}
            onOpenPocketMode={() => setIsPocketModalOpen(true)}
            onBackToCharacterSelect={() => setCurrentPage('welcome')}
            onOpenDailyChallenges={() => setCurrentPage('challenges')}
            onOpenStickers={() => setCurrentPage('stickers')}
            onOpenBioCards={() => setCurrentPage('biocards')}
            onOpenBlueprint={() => setCurrentPage('blueprint')}
            unlockedStickers={unlockedStickers}
            setUnlockedStickers={setUnlockedStickers}
            currentLevel={currentLevel}
            setCurrentLevel={setCurrentLevel}
            totalXp={totalXp}
            setTotalXp={setTotalXp}
            dailyChallenges={dailyChallenges}
          />
        </main>
      )}

      {/* =========================================================================
          PAGE 3: DAILY CHALLENGES (DEDICATED FULL VIEW)
          ========================================================================= */}
      {currentPage === 'challenges' && (
        <main className="relative z-10 min-h-[calc(100vh-64px)] pb-24 lg:pb-10">
          <DailyChallengesView
            challenges={dailyChallenges}
            onToggleChallenge={handleToggleDailyChallenge}
            onRefreshChallenges={handleRefreshChallenges}
            isRefreshing={isFetchingChallenges}
            onStartMission={() => setCurrentPage('playing')}
            selectedBiome="Redwood & Oak Woodland"
            totalXp={totalXp}
          />
        </main>
      )}

      {/* =========================================================================
          PAGE 4: MY FIELD STICKERS (DEDICATED FULL VIEW)
          ========================================================================= */}
      {currentPage === 'stickers' && (
        <main className="relative z-10 min-h-[calc(100vh-64px)] pb-24 lg:pb-10">
          <StickerAlbumView
            unlockedStickers={unlockedStickers}
            onStartMission={() => setCurrentPage('playing')}
          />
        </main>
      )}

      {/* =========================================================================
          PAGE 5: ECOSYSTEM BIO CARDS & 3D PET COMPANION DECK
          ========================================================================= */}
      {currentPage === 'biocards' && (
        <main className="relative z-10 min-h-[calc(100vh-64px)] py-4 sm:py-6 px-3 sm:px-6 max-w-5xl mx-auto space-y-4 pb-24 lg:pb-10">
          <div className="flex items-center justify-between pb-2 border-b border-stone-300">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 tracking-wider">
                BIOLOGICAL ARTIFACT CODEX
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-stone-900">
                Ecosystem Specimen Deck & Pet Companion
              </h2>
            </div>
            <button
              onClick={() => setCurrentPage('playing')}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-stone-50 font-mono text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>TO MISSION</span>
            </button>
          </div>
          <BioCardsDeck onStartMission={() => setCurrentPage('playing')} />
        </main>
      )}

      {/* =========================================================================
          PAGE 7: SYSTEM ARCHITECTURE & SPATIAL AUDIO BLUEPRINT
          ========================================================================= */}
      {currentPage === 'blueprint' && (
        <main className="relative z-10 min-h-[calc(100vh-64px)] py-4 sm:py-6 px-3 sm:px-6 max-w-5xl mx-auto space-y-4 pb-24 lg:pb-10">
          <div className="flex items-center justify-between pb-2 border-b border-stone-300">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-purple-800 tracking-wider">
                ENGINEERING SPECIFICATIONS
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-stone-900">
                System Blueprint & Spatial Audio Compass
              </h2>
            </div>
            <button
              onClick={() => setCurrentPage('playing')}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-stone-50 font-mono text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>TO MISSION</span>
            </button>
          </div>
          <ArchitectureBlueprint />
        </main>
      )}

      {/* =========================================================================
          PAGE 8: FULL TACTICAL GOOGLE MAP & REAL-WORLD SATELLITE RADAR
          ========================================================================= */}
      {currentPage === 'map' && (
        <main className="relative z-10 min-h-[calc(100vh-64px)] py-4 sm:py-6 px-3 sm:px-6 max-w-6xl mx-auto space-y-4 pb-24 lg:pb-10">
          <div className="flex items-center justify-between pb-2 border-b border-stone-300">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 tracking-wider">
                TACTICAL RADAR · GOOGLE MAPS PLATFORM
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-stone-900">
                Satellite Field Radar
              </h2>
            </div>
            <button
              onClick={() => setCurrentPage('playing')}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-stone-50 font-mono text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>TO MISSION</span>
            </button>
          </div>

          <ComponentErrorBoundary componentName="Tactical Map">
            <TacticalGoogleMap
              telemetry={telemetry}
              waypoints={appWaypoints}
              activeWaypoint={activeMapWaypoint}
              onSelectWaypoint={setActiveMapWaypoint}
              explorerName={explorerName}
            />
          </ComponentErrorBoundary>
        </main>
      )}

      {/* =========================================================================
          MOBILE FIXED BOTTOM DOCKED NAVIGATION (< lg screens)
          Thumb-accessible, perfectly aligned, zero overlapping!
          ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#ebeae5]/95 backdrop-blur-lg border-t border-stone-300/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-1.5 py-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none">
        <button
          onClick={() => {
            hapticFeedback.tactileClick();
            setCurrentPage('welcome');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentPage === 'welcome'
              ? 'text-stone-950 font-bold bg-stone-300/90 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5 text-emerald-600" />
          <span className="text-[9px] sm:text-[10px] font-mono">Profile</span>
        </button>

        <button
          onClick={() => {
            hapticFeedback.tactileClick();
            setCurrentPage('playing');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentPage === 'playing'
              ? 'text-stone-950 font-bold bg-stone-300/90 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <MapPin className="w-4 h-4 mb-0.5 text-emerald-600" />
          <span className="text-[9px] sm:text-[10px] font-mono">Mission</span>
        </button>

        <button
          onClick={() => {
            hapticFeedback.tactileClick();
            setCurrentPage('challenges');
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentPage === 'challenges'
              ? 'text-stone-950 font-bold bg-stone-300/90 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Award className="w-4 h-4 mb-0.5 text-amber-500" />
          <span className="text-[9px] sm:text-[10px] font-mono">Quests</span>
          {completedChallengesCount < dailyChallenges.length && (
            <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            hapticFeedback.tactileClick();
            setCurrentPage('stickers');
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentPage === 'stickers'
              ? 'text-stone-950 font-bold bg-stone-300/90 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5 text-sky-500" />
          <span className="text-[9px] sm:text-[10px] font-mono">Stickers</span>
          <span className="absolute -top-0.5 right-0.5 text-[8px] px-1 rounded-full bg-amber-400 text-stone-950 font-bold">
            {unlockedStickers.length}
          </span>
        </button>

        <button
          onClick={() => {
            hapticFeedback.tactileClick();
            setCurrentPage(currentPage === 'biocards' ? 'blueprint' : 'biocards');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentPage === 'biocards' || currentPage === 'blueprint'
              ? 'text-stone-950 font-bold bg-stone-300/90 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5 text-emerald-700" />
          <span className="text-[9px] sm:text-[10px] font-mono">
            {currentPage === 'blueprint' ? 'Blueprint' : 'Codex'}
          </span>
        </button>
      </nav>

      {/* GLOBAL FLOATING VOICE ACTIVATOR (Accessible across all screens / mobile) */}
      <aside aria-label="Aura Voice Assistant" className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-3.5 sm:right-6 z-40 flex items-center gap-2 select-none">
        {voiceState.currentTranscript && voiceState.status === 'listening' ? (
          <div className="bg-stone-900/95 text-emerald-300 border border-emerald-600/70 shadow-2xl px-3 py-1.5 rounded-2xl text-xs font-mono font-bold max-w-xs truncate animate-pulse backdrop-blur-md">
            Hearing: "{voiceState.currentTranscript}"
          </div>
        ) : voiceState.status === 'listening' ? (
          <div className="bg-rose-950/90 text-rose-300 border border-rose-500/60 shadow-2xl px-3 py-1.5 rounded-2xl text-xs font-mono font-bold max-w-xs truncate animate-pulse backdrop-blur-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span>Listening... Tap to send</span>
          </div>
        ) : voiceState.status === 'idle' ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-stone-900/90 text-stone-300 border border-stone-700/80 text-xs font-mono font-bold shadow-lg backdrop-blur-md pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tap to Speak</span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            hapticFeedback.buttonPress();
            voiceAssistantService.unlockAudioContext();
            voiceAssistantService.toggleListening({ explorerName });
          }}
          className={`relative p-3.5 sm:p-4 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center justify-center cursor-pointer transition-all active:scale-95 border ${
            voiceState.status === 'listening'
              ? 'bg-rose-500 border-rose-300 text-white scale-110 ring-4 ring-rose-400/50 animate-pulse'
              : voiceState.status === 'speaking'
              ? 'bg-emerald-600 border-emerald-300 text-white ring-4 ring-emerald-400/40 animate-pulse'
              : voiceState.status === 'thinking'
              ? 'bg-amber-500 border-amber-300 text-stone-950 animate-pulse'
              : 'bg-stone-900 hover:bg-stone-850 text-emerald-400 border-emerald-600/50 hover:scale-105'
          }`}
          title={
            voiceState.status === 'listening'
              ? 'Listening to your voice... Tap to send'
              : voiceState.status === 'speaking'
              ? 'Aura is speaking... Tap to interrupt'
              : 'Tap to speak with Aura'
          }
        >
          {voiceState.status === 'listening' ? (
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
          ) : voiceState.status === 'speaking' ? (
            <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          ) : voiceState.status === 'thinking' ? (
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
          ) : (
            <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
          )}

          {/* Glowing pulse ring if idle */}
          {voiceState.status === 'idle' && (
            <span className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping pointer-events-none duration-1000" />
          )}
        </button>
      </aside>

      {/* VOICE API KEY & ELEVENLABS CONFIGURATION MODAL */}
      <VoiceApiKeyModal
        isOpen={isVoiceKeyModalOpen}
        onClose={() => setIsVoiceKeyModalOpen(false)}
      />

      {/* ADD CUSTOM BACKGROUND MUSIC MODAL */}
      <AddMusicModal
        isOpen={isAddMusicModalOpen}
        onClose={() => setIsAddMusicModalOpen(false)}
      />

      {/* FULLSCREEN OLED POCKET MODE MODAL (OPTIMIZED FOR MOBILE OUTDOOR GAMEPLAY) */}
      {isPocketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md">
          <div className="relative w-full h-[100dvh] sm:h-auto sm:max-w-xl sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl bg-black border-0 sm:border border-white/20 shadow-2xl p-4 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 font-mono text-sm text-white font-bold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>PHONE MODE · AURA QUEST HUD (ECOQUEST GO)</span>
              </div>
              <button
                onClick={() => setIsPocketModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PocketModeHUD
                isFullScreen={true}
                onClose={() => setIsPocketModalOpen(false)}
                explorerName={explorerName}
                playerScore={totalXp}
                playerInventory={unlockedStickers.map((s) => s.name)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
