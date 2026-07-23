"use client";

import {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { HOST_AGENT, LIBRARY_AGENTS, getAgentById, withInteractionMode, withModel } from "@/lib/agents";
import {
  EXPERT_EMOJI_OPTIONS,
  EXPERT_TONES,
  createCustomExpert,
  extractCustomDescription,
  loadCustomExperts,
  saveCustomExperts,
  toneLabel,
} from "@/lib/customExperts";
import { downloadMeetingNotesPdf } from "@/lib/exportNotesPdf";
import { AGENT_MODELS, DEFAULT_AGENT_MODEL, type AgentModelId } from "@/lib/models";
import type { Agent, AgentInteractionMode, ExpertTone, MeetingMemory, Message, Source } from "@/lib/types";

type Panel = "chat" | "people" | "notes" | "sources" | null;
type IconName =
  | "mic" | "micOff" | "camera" | "cameraOff" | "chat" | "people"
  | "more" | "leave" | "share" | "close" | "send" | "search"
  | "link" | "notes" | "chair" | "sun" | "moon" | "check"
  | "screen" | "personAdd" | "download" | "attach" | "bell"
  | "sparkles" | "stop" | "keyboard";

const iconPaths: Record<IconName, string> = {
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6",
  micOff: "m4 4 16 16M9 9v3a3 3 0 0 0 4.7 2.5M15 11V6a3 3 0 0 0-5.1-2.1M5.5 11a6.5 6.5 0 0 0 11 4.7M12 18v3M9 21h6",
  camera: "M5 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm11 4 5-3v10l-5-3",
  cameraOff: "m3 3 18 18M10 6h4a2 2 0 0 1 2 2v2l5-3v10l-3-1.8M16 16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 1-1.7",
  chat: "M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-4a2 2 0 0 1-1-1V7a2 2 0 0 1 2-2Z",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 4 5",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  leave: "M4 12h10M10 8l4 4-4 4M14 5h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5",
  share: "M12 3v12M7 8l5-5 5 5M5 13v6h14v-6",
  close: "m6 6 12 12M18 6 6 18",
  send: "M5 12h14M13 6l6 6-6 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4",
  link: "M10 13a5 5 0 0 0 7 0l1.5-1.5a5 5 0 0 0-7-7L10 6M14 11a5 5 0 0 0-7 0l-1.5 1.5a5 5 0 0 0 7 7L14 18",
  notes: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
  chair: "M7 10V4h10v6M5 10h14v4H5zM7 14v6M17 14v6",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2",
  moon: "M20 15a8 8 0 0 1-11-11 8.5 8.5 0 1 0 11 11Z",
  check: "m5 12 4 4L19 6",
  screen: "M4 4h16v11H4zM8 20h8M12 15v5",
  personAdd: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a6 6 0 0 1 12 0M18 8v6M15 11h6",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  attach: "M21.4 11.6 12 21a5 5 0 0 1-7-7l9.9-9.9a3.5 3.5 0 0 1 5 5L10 19a2 2 0 1 1-2.8-2.8l8.5-8.5",
  bell: "M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5M9 17a3 3 0 0 0 6 0",
  sparkles: "M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 14l.8 2.4L8 17l-2.2.7L5 20l-.8-2.3L2 17l2.2-.6L5 14Zm14 1 .7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z",
  stop: "M6 6h12v12H6z",
  keyboard: "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM7 10h.01M11 10h.01M15 10h.01M7 14h10M17 10h.01",
};

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  content: string;
};

const MAX_FILE_BYTES = 400_000;
const MAX_FILE_CHARS = 20_000;
const MAX_ATTACHED_FILES = 5;

const TEXT_FILE_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
]);

const TEXT_FILE_EXTENSIONS = /\.(txt|md|markdown|csv|json|xml|html|htm|css|js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|yml|yaml|toml|ini|log|sql|sh|env)$/i;

function isReadableTextFile(file: File) {
  if (TEXT_FILE_TYPES.has(file.type)) return true;
  if (!file.type || file.type === "application/octet-stream") {
    return TEXT_FILE_EXTENSIONS.test(file.name);
  }
  return TEXT_FILE_EXTENSIONS.test(file.name);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}

const PREVIEW_GOLD_SPEAK = false;

function GoldSpeakingOrb({
  active,
  present,
  size = "card",
  label = "Speaking",
}: {
  active: boolean;
  present?: boolean;
  size?: "mini" | "card" | "stage";
  label?: string;
}) {
  const isActive = PREVIEW_GOLD_SPEAK || active;
  const isPresent = PREVIEW_GOLD_SPEAK || (present ?? active);
  return (
    <div
      className={`gold-speak size-${size} ${isPresent ? "is-present" : ""} ${isActive ? "is-active" : "is-idle"}`}
      aria-hidden={!isActive}
      aria-label={isActive ? label : undefined}
      role={isActive ? "status" : undefined}
    >
      <span className="gold-speak-halo" />
      <span className="gold-speak-halo gold-speak-halo-delayed" />
      <span className="gold-speak-core">
        <span className="gold-speak-sheen" />
      </span>
      <span className="gold-speak-wave" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index} style={{ animationDelay: `${index * 0.12}s` }} />
        ))}
      </span>
    </div>
  );
}

type ExpertDensity = "roomy" | "compact" | "collapsed";

function getExpertDensity(count: number): ExpertDensity {
  if (count <= 3) return "roomy";
  if (count <= 5) return "compact";
  return "collapsed";
}

function agentInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function agentMark(agent: Pick<Agent, "name" | "emoji">) {
  return agent.emoji?.trim() || agentInitials(agent.name);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function welcomeMessage(): Message {
  return {
    id: createId(),
    role: "assistant",
    content:
      "Welcome to ThinkRoom. Select an expert and ask your question. Everyone in this room shares the same meeting context.",
    agentId: HOST_AGENT.id,
    agentName: HOST_AGENT.name,
    createdAt: new Date().toISOString(),
  };
}

function hostnameOf(uri: string) {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

function Home() {
  const { isDarkMode, setIsDarkMode } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const freshParam = searchParams.get("fresh");
  const inviteParam = searchParams.get("invite");
  const [joinedAgents, setJoinedAgents] = useState<Agent[]>([
    HOST_AGENT,
    LIBRARY_AGENTS[0],
    LIBRARY_AGENTS[2],
  ]);
  const [activeAgentId, setActiveAgentId] = useState(HOST_AGENT.id);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage()]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enableSearch, setEnableSearch] = useState(true);
  const [researchMode, setResearchMode] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [showChatKeyboard, setShowChatKeyboard] = useState(false);
  const [showExpertPicker, setShowExpertPicker] = useState(false);
  const [showCustomExpertForm, setShowCustomExpertForm] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [customAgents, setCustomAgents] = useState<Agent[]>([]);
  const [customExpertsHydrated, setCustomExpertsHydrated] = useState(false);
  const [customMenuId, setCustomMenuId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customEmoji, setCustomEmoji] = useState<string>(EXPERT_EMOJI_OPTIONS[0]);
  const [customTone, setCustomTone] = useState<ExpertTone>("professional");
  const [customRoleHint, setCustomRoleHint] = useState("");
  const [isEnhancingExpert, setIsEnhancingExpert] = useState(false);
  const [customFormError, setCustomFormError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [memory, setMemory] = useState<MeetingMemory>({
    goal: "",
    decisions: [],
    openQuestions: [],
    summary: "",
  });
  const [takeAiNotes, setTakeAiNotes] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isVoicing, setIsVoicing] = useState(false);
  const [voicingAgentId, setVoicingAgentId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [pinnedPopoverId, setPinnedPopoverId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDraggingContext, setIsDraggingContext] = useState(false);
  const [composerDropActive, setComposerDropActive] = useState(false);
  const popoverCloseTimerRef = useRef<number | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const isDraggingContextRef = useRef(false);
  const [pickerModels, setPickerModels] = useState<Record<string, AgentModelId>>(
    () =>
      Object.fromEntries(
        LIBRARY_AGENTS.map((agent) => [agent.id, agent.model]),
      ) as Record<string, AgentModelId>,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelComposerInputRef = useRef<HTMLTextAreaElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isVoicingRef = useRef(false);
  const isMutedRef = useRef(true);
  const voiceStartedAtRef = useRef(0);

  const activeAgent =
    joinedAgents.find((agent) => agent.id === activeAgentId) ?? HOST_AGENT;

  const allSources = useMemo(() => {
    const seen = new Set<string>();
    return messages.flatMap((message) => message.sources ?? []).filter((source) => {
      if (seen.has(source.uri)) return false;
      seen.add(source.uri);
      return true;
    });
  }, [messages]);

  const activityNotifications = useMemo(() => {
    return [...messages]
      .reverse()
      .filter((message) => message.role === "assistant")
      .slice(0, 8)
      .map((message) => ({
        id: message.id,
        title: message.agentName || "AI specialist",
        body: message.content.replace(/\s+/g, " ").trim().slice(0, 160),
        fullText: message.content,
        agentId: message.agentId,
      }));
  }, [messages]);

  useEffect(() => {
    const expertsTimer = window.setTimeout(() => {
      const stored = loadCustomExperts();
      setCustomAgents(stored);
      setCustomExpertsHydrated(true);
      setPickerModels((current) => {
        const next = { ...current };
        for (const agent of stored) {
          if (!next[agent.id]) next[agent.id] = agent.model;
        }
        return next;
      });
    }, 0);

    return () => {
      window.clearTimeout(expertsTimer);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let shouldReplace = false;

    if (!params.get("room")) {
      params.set(
        "room",
        `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`,
      );
      shouldReplace = true;
    }

    if (freshParam === "1") {
      setJoinedAgents([HOST_AGENT, LIBRARY_AGENTS[0], LIBRARY_AGENTS[2]]);
      setActiveAgentId(HOST_AGENT.id);
      setMessages([welcomeMessage()]);
      setMemory({
        goal: "",
        decisions: [],
        openQuestions: [],
        summary: "",
      });
      setAttachedFiles([]);
      setInput("");
      setError(null);
      setPanel(null);
      params.delete("fresh");
      shouldReplace = true;
    }

    if (inviteParam === "1") {
      setShowInvite(true);
      params.delete("invite");
      shouldReplace = true;
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    if (shouldReplace) {
      router.replace(nextUrl, { scroll: false });
    }

    const timer = window.setTimeout(
      () => setRoomUrl(`${window.location.origin}${nextUrl}`),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [roomParam, freshParam, inviteParam, router, searchParams]);

  useEffect(() => {
    if (!customExpertsHydrated) return;
    saveCustomExperts(customAgents);
  }, [customAgents, customExpertsHydrated]);

  useEffect(() => {
    if (panel === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending, panel]);

  useEffect(() => {
    if (panel !== "chat") setShowChatKeyboard(false);
  }, [panel]);

  useEffect(() => {
    if (panel !== "chat" || !showChatKeyboard) return;
    const timer = window.setTimeout(() => panelComposerInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [panel, showChatKeyboard]);

  useEffect(() => {
    isVoicingRef.current = isVoicing;
  }, [isVoicing]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Mic barge-in: while unmuted, interrupt AI speech when the user starts talking.
  useEffect(() => {
    if (isMuted || typeof window === "undefined") return;

    const stream = mediaStreamRef.current;
    const liveTrack = stream
      ?.getAudioTracks()
      .find((track) => track.enabled && track.readyState === "live");
    if (!stream || !liveTrack) return;

    let cancelled = false;
    let rafId = 0;
    let audioContext: AudioContext | null = null;
    let loudMs = 0;
    let lastTs = performance.now();

    const RMS_THRESHOLD = 0.09;
    const SUSTAIN_MS = 180;
    const GRACE_MS = 550;

    async function startMonitor() {
      try {
        audioContext = new AudioContext();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        if (cancelled || !stream) return;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.35;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        const tick = (ts: number) => {
          if (cancelled) return;
          const dt = Math.min(48, ts - lastTs);
          lastTs = ts;
          analyser.getByteTimeDomainData(samples);

          let sum = 0;
          for (let i = 0; i < samples.length; i += 1) {
            const v = (samples[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / samples.length);

          const canBargeIn =
            isVoicingRef.current &&
            !isMutedRef.current &&
            Date.now() - voiceStartedAtRef.current > GRACE_MS;

          if (canBargeIn && rms >= RMS_THRESHOLD) {
            loudMs += dt;
            if (loudMs >= SUSTAIN_MS) {
              loudMs = 0;
              stopSpeaking();
            }
          } else {
            loudMs = 0;
          }

          rafId = window.requestAnimationFrame(tick);
        };

        rafId = window.requestAnimationFrame(tick);
      } catch {
        // Mic monitoring unavailable — Stop button still works.
      }
    }

    void startMonitor();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      void audioContext?.close();
    };
  }, [isMuted]);

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isVoicingRef.current = false;
    setIsVoicing(false);
    setVoicingAgentId(null);
  }

  function speakReply(text: string, agentId: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 1600));
    utterance.rate = 1.02;
    utterance.lang = "en-US";
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter((voice) => /^en\b/i.test(voice.lang));
    const preferred =
      englishVoices.find(
        (voice) =>
          /en(-|_)?US/i.test(voice.lang) &&
          /natural|neural|online/i.test(voice.name),
      ) ||
      englishVoices.find((voice) => /natural|neural|online/i.test(voice.name)) ||
      englishVoices.find(
        (voice) =>
          /en(-|_)?US/i.test(voice.lang) &&
          /google|microsoft|aria|guy|jenny|davis|zira|mark/i.test(voice.name),
      ) ||
      englishVoices.find((voice) => /en(-|_)?US/i.test(voice.lang)) ||
      englishVoices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => {
      voiceStartedAtRef.current = Date.now();
      isVoicingRef.current = true;
      setIsVoicing(true);
      setVoicingAgentId(agentId);
    };
    utterance.onend = () => {
      isVoicingRef.current = false;
      setIsVoicing(false);
      setVoicingAgentId(null);
    };
    utterance.onerror = () => {
      isVoicingRef.current = false;
      setIsVoicing(false);
      setVoicingAgentId(null);
    };
    voiceStartedAtRef.current = Date.now();
    isVoicingRef.current = true;
    setIsVoicing(true);
    setVoicingAgentId(agentId);
    window.speechSynthesis.speak(utterance);
  }

  async function ensureMedia(kind: "audio" | "video") {
    try {
      const current = mediaStreamRef.current;
      const hasTrack =
        kind === "audio"
          ? Boolean(current?.getAudioTracks().length)
          : Boolean(current?.getVideoTracks().length);
      if (hasTrack) return current!;

      const incoming = await navigator.mediaDevices.getUserMedia({
        audio: kind === "audio",
        video: kind === "video",
      });
      const merged = current ?? new MediaStream();
      incoming.getTracks().forEach((track) => merged.addTrack(track));
      mediaStreamRef.current = merged;
      if (videoRef.current) videoRef.current.srcObject = merged;
      setMediaError(null);
      return merged;
    } catch {
      setMediaError(`Allow ${kind} access in your browser to use this control.`);
      return null;
    }
  }

  async function toggleMute() {
    if (isMuted) {
      const stream = await ensureMedia("audio");
      if (!stream) return;
      stream.getAudioTracks().forEach((track) => (track.enabled = true));
    } else {
      mediaStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = false));
    }
    setIsMuted((value) => !value);
  }

  async function toggleCamera() {
    if (isCameraOff) {
      const stream = await ensureMedia("video");
      if (!stream) return;
      stream.getVideoTracks().forEach((track) => (track.enabled = true));
      if (videoRef.current && !isScreenSharing) videoRef.current.srcObject = stream;
    } else {
      mediaStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => (track.enabled = false));
    }
    setIsCameraOff((value) => !value);
  }

  function stopScreenShare() {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    if (videoRef.current) {
      videoRef.current.srcObject = isCameraOff ? null : mediaStreamRef.current;
    }
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError("Screen sharing is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", stopScreenShare, {
        once: true,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsScreenSharing(true);
      setMediaError(null);
    } catch {
      setMediaError("Screen sharing was cancelled or could not be started.");
    }
  }

  const canSummarizeMeeting = useMemo(() => {
    const userTurns = messages.filter((message) => message.role === "user").length;
    const assistantTurns = messages.filter(
      (message) =>
        message.role === "assistant" &&
        message.content !==
          "Welcome to ThinkRoom. Select an expert and ask your question. Everyone in this room shares the same meeting context.",
    ).length;
    return userTurns >= 1 && assistantTurns >= 1;
  }, [messages]);

  async function summarizeMeeting() {
    if (!canSummarizeMeeting || isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "summary",
          model: DEFAULT_AGENT_MODEL,
          messages: messages.map(({ role, content, agentName }) => ({
            role,
            content,
            agentName,
          })),
        }),
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        memory?: {
          goal?: string;
          decisions?: string[];
          openQuestions?: string[];
          nextSteps?: string[];
          summary?: string;
        };
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize the meeting.");
      }

      const nextSteps = data.memory?.nextSteps?.filter(Boolean) ?? [];
      const narrative =
        data.memory?.summary?.trim() ||
        data.text?.trim() ||
        "Summary unavailable.";
      const summaryWithSteps =
        nextSteps.length > 0
          ? `${narrative}\n\nNext steps:\n${nextSteps.map((step) => `- ${step}`).join("\n")}`
          : narrative;

      setMemory((current) => ({
        goal: data.memory?.goal?.trim() || current.goal,
        decisions:
          data.memory?.decisions && data.memory.decisions.length > 0
            ? data.memory.decisions
            : current.decisions,
        openQuestions:
          data.memory?.openQuestions && data.memory.openQuestions.length > 0
            ? data.memory.openQuestions
            : current.openQuestions,
        summary: summaryWithSteps,
      }));
    } catch (summarizeErr) {
      setSummaryError(
        summarizeErr instanceof Error
          ? summarizeErr.message
          : "Could not summarize the meeting.",
      );
    } finally {
      setIsSummarizing(false);
    }
  }

  function updateMemory(userText: string, reply: string, notesOn: boolean) {
    setMemory((current) => {
      const next = {
        ...current,
        decisions: [...current.decisions],
        openQuestions: [...current.openQuestions],
      };
      if (!next.goal && userText.length > 10) next.goal = userText.slice(0, 130);
      const recommendation = reply.match(
        /(?:recommend|should|next step)[:\s]+([^\n.]+)/i,
      )?.[1];
      if (recommendation && next.decisions.length < 5) {
        next.decisions.push(recommendation.trim().slice(0, 110));
      }
      const question = reply
        .split(/(?<=[.!?])\s+/)
        .find((sentence) => sentence.includes("?"));
      if (question && next.openQuestions.length < 5) {
        next.openQuestions.push(question.trim().slice(0, 120));
      }
      if (notesOn) {
        const beat = `You: ${userText.slice(0, 90)} → ${reply.slice(0, 140)}`;
        const prior = next.summary
          ? next.summary.split("\n").filter(Boolean)
          : [];
        next.summary = [...prior, beat].slice(-8).join("\n");
      }
      return next;
    });
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    const agent =
      joinedAgents.find((item) => item.id === activeAgentId) ??
      getAgentById(activeAgentId) ??
      activeAgent;
    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      mode: researchMode ? "research" : "chat",
      usedSearch: enableSearch,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: agent.systemPrompt,
          agentName: agent.name,
          model: agent.model,
          enableSearch,
          mode: researchMode ? "research" : "chat",
          fileContext: buildFileContext(),
          messages: nextMessages.map(({ role, content, agentName }) => ({
            role,
            content,
            agentName,
          })),
        }),
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        sources?: Source[];
        usedSearch?: boolean;
        mode?: "chat" | "research";
        model?: AgentModelId;
      };
      if (!response.ok || !data.text) {
        throw new Error(data.error || "Failed to get a reply.");
      }
      const reply: Message = {
        id: createId(),
        role: "assistant",
        content: data.text,
        agentId: agent.id,
        agentName: agent.name,
        createdAt: new Date().toISOString(),
        sources: data.sources ?? [],
        usedSearch: data.usedSearch,
        mode: data.mode,
        model: data.model ?? agent.model,
      };
      setMessages((current) => [...current, reply]);
      setShowChatKeyboard(false);
      updateMemory(text, data.text, takeAiNotes);
      if (agent.interactionMode === "talk") {
        speakReply(data.text, agent.id);
      } else {
        setPanel("chat");
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Something went wrong.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function shareRoom() {
    const shareData = {
      title: "Join my ThinkRoom meeting",
      text: "Join my AI expert meeting room",
      url: roomUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(roomUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // Closing the native share sheet is expected.
    }
  }

  function inviteAgent(agent: Agent) {
    const seated = withModel(
      agent,
      pickerModels[agent.id] ?? agent.model,
    );
    setJoinedAgents((current) =>
      current.some((item) => item.id === seated.id)
        ? current
        : [...current, seated],
    );
    setActiveAgentId(seated.id);
    setShowExpertPicker(false);
    setCustomMenuId(null);
  }

  function resetCustomExpertForm() {
    setEditingCustomId(null);
    setCustomTitle("");
    setCustomDescription("");
    setCustomEmoji(EXPERT_EMOJI_OPTIONS[0]);
    setCustomTone("professional");
    setCustomRoleHint("");
    setCustomFormError(null);
    setIsEnhancingExpert(false);
  }

  function openCreateCustomExpert() {
    resetCustomExpertForm();
    setCustomMenuId(null);
    setShowCustomExpertForm(true);
  }

  function openEditCustomExpert(agent: Agent) {
    setEditingCustomId(agent.id);
    setCustomTitle(agent.name);
    setCustomDescription(extractCustomDescription(agent.systemPrompt));
    setCustomEmoji(agent.emoji || EXPERT_EMOJI_OPTIONS[0]);
    setCustomTone(agent.tone ?? "professional");
    setCustomRoleHint(agent.role.replace(/\s*·\s*Custom$/i, "").trim());
    setCustomFormError(null);
    setCustomMenuId(null);
    setShowCustomExpertForm(true);
  }

  function closeCustomExpertForm() {
    setShowCustomExpertForm(false);
    resetCustomExpertForm();
  }

  async function enhanceCustomExpert() {
    if (!customTitle.trim() && !customDescription.trim()) {
      setCustomFormError("Add a title or description before enhancing.");
      return;
    }
    setIsEnhancingExpert(true);
    setCustomFormError(null);
    try {
      const response = await fetch("/api/enhance-expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: customTitle.trim(),
          description: customDescription.trim(),
          tone: customTone,
        }),
      });
      const data = (await response.json()) as {
        description?: string;
        role?: string;
        emoji?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not enhance this expert.");
      }
      if (data.description) setCustomDescription(data.description);
      if (data.role) setCustomRoleHint(data.role);
      if (data.emoji) setCustomEmoji(data.emoji);
    } catch (enhanceError) {
      setCustomFormError(
        enhanceError instanceof Error
          ? enhanceError.message
          : "Could not enhance this expert.",
      );
    } finally {
      setIsEnhancingExpert(false);
    }
  }

  function saveCustomExpert() {
    const title = customTitle.trim();
    const description = customDescription.trim();
    if (!title || !description) {
      setCustomFormError("Title and description are required.");
      return;
    }

    const nextAgent = createCustomExpert({
      id: editingCustomId ?? undefined,
      name: title,
      description,
      emoji: customEmoji,
      tone: customTone,
      role: customRoleHint.trim() || undefined,
      model:
        (editingCustomId &&
          (pickerModels[editingCustomId] ??
            customAgents.find((agent) => agent.id === editingCustomId)?.model)) ||
        DEFAULT_AGENT_MODEL,
    });

    if (editingCustomId) {
      setCustomAgents((current) =>
        current.map((agent) =>
          agent.id === editingCustomId ? nextAgent : agent,
        ),
      );
      setJoinedAgents((current) =>
        current.map((agent) => {
          if (agent.id !== editingCustomId) return agent;
          return {
            ...nextAgent,
            model: agent.model,
            interactionMode: agent.interactionMode,
          };
        }),
      );
    } else {
      setCustomAgents((current) => [...current, nextAgent]);
      setPickerModels((current) => ({
        ...current,
        [nextAgent.id]: nextAgent.model,
      }));
    }

    closeCustomExpertForm();
  }

  function deleteCustomExpert(agentId: string) {
    setCustomAgents((current) =>
      current.filter((agent) => agent.id !== agentId),
    );
    setJoinedAgents((current) =>
      current.filter((agent) => agent.id !== agentId),
    );
    setActiveAgentId((current) =>
      current === agentId ? HOST_AGENT.id : current,
    );
    setCustomMenuId(null);
    if (editingCustomId === agentId) closeCustomExpertForm();
  }

  function removeAttachedFile(fileId: string) {
    setAttachedFiles((current) => current.filter((file) => file.id !== fileId));
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;

    const incoming = Array.from(fileList);
    const remainingSlots = MAX_ATTACHED_FILES - attachedFiles.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_ATTACHED_FILES} files.`);
      return;
    }

    const selected = incoming.slice(0, remainingSlots);
    const nextFiles: AttachedFile[] = [];
    const problems: string[] = [];

    for (const file of selected) {
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`${file.name} is larger than 400KB.`);
        continue;
      }
      if (!isReadableTextFile(file)) {
        problems.push(`${file.name} isn’t a supported text file.`);
        continue;
      }
      try {
        const raw = await file.text();
        const content = raw.slice(0, MAX_FILE_CHARS).trim();
        if (!content) {
          problems.push(`${file.name} is empty.`);
          continue;
        }
        nextFiles.push({
          id: createId(),
          name: file.name,
          size: file.size,
          content,
        });
      } catch {
        problems.push(`Could not read ${file.name}.`);
      }
    }

    if (nextFiles.length) {
      setAttachedFiles((current) => [...current, ...nextFiles]);
      setError(null);
    }
    if (problems.length) {
      setError(problems.join(" "));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function buildFileContext() {
    if (!attachedFiles.length) return undefined;
    return attachedFiles
      .map(
        (file, index) =>
          `--- FILE ${index + 1}: ${file.name} (${formatFileSize(file.size)}) ---\n${file.content}`,
      )
      .join("\n\n");
  }

  function removeAgent(agentId: string) {
    if (agentId === HOST_AGENT.id) return;
    if (voicingAgentId === agentId) stopSpeaking();
    setJoinedAgents((current) => current.filter((agent) => agent.id !== agentId));
    setActiveAgentId((current) =>
      current === agentId ? HOST_AGENT.id : current,
    );
    setOpenPopoverId((current) => (current === agentId ? null : current));
    setPinnedPopoverId((current) => (current === agentId ? null : current));
  }

  function setAgentModel(agentId: string, model: AgentModelId) {
    setJoinedAgents((current) =>
      current.map((agent) =>
        agent.id === agentId ? withModel(agent, model) : agent,
      ),
    );
  }

  function setAgentInteractionMode(
    agentId: string,
    interactionMode: AgentInteractionMode,
  ) {
    setJoinedAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? withInteractionMode(agent, interactionMode)
          : agent,
      ),
    );
    setActiveAgentId(agentId);
    if (interactionMode === "chat") {
      stopSpeaking();
      setPanel("chat");
    }
  }

  function isAgentAudiblyActive(agent: Agent) {
    if (PREVIEW_GOLD_SPEAK) return true;
    if (agent.id !== activeAgentId) return false;
    if (isSending) return true;
    return isVoicing && voicingAgentId === agent.id;
  }

  function exportNotesPdf() {
    try {
      downloadMeetingNotesPdf({
        roomCode: typeof roomCode === "string" ? roomCode : "meeting",
        takeAiNotes,
        memory,
        messages,
        participants: [
          { name: "You", role: "Meeting host", model: "gemini-2.0-flash" },
          ...joinedAgents.map((agent) => ({
            name: agent.name,
            role: agent.role,
            model: agent.model,
          })),
        ],
      });
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Could not export PDF.",
      );
    }
  }

  function leaveMeeting() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    window.location.href = "/";
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const seatedIds = new Set(joinedAgents.map((agent) => agent.id));
  const availableLibraryAgents = LIBRARY_AGENTS.filter(
    (agent) => !seatedIds.has(agent.id),
  );
  const pickerAgents = [
    ...customAgents,
    ...availableLibraryAgents,
  ];
  const canCreateCustomExpert =
    customTitle.trim().length > 0 && customDescription.trim().length > 0;
  const customPreviewAgent = {
    name: customTitle.trim() || "Custom expert",
    role: customRoleHint.trim()
      ? `${customRoleHint.trim()} · Custom`
      : `${toneLabel(customTone)} · Custom`,
    emoji: customEmoji,
  };
  const roomCode = roomUrl
    ? new URL(roomUrl).searchParams.get("room")
    : "Preparing room…";
  const expertDensity = getExpertDensity(joinedAgents.length);
  const visiblePopoverId = pinnedPopoverId ?? openPopoverId;

  useEffect(() => {
    if (expertDensity !== "collapsed") {
      setOpenPopoverId(null);
      setPinnedPopoverId(null);
    }
  }, [expertDensity]);

  useEffect(() => {
    if (!pinnedPopoverId && !showNotifications) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        pinnedPopoverId &&
        !target?.closest(`[data-agent-popover="${pinnedPopoverId}"]`)
      ) {
        setPinnedPopoverId(null);
        setOpenPopoverId(null);
      }
      if (
        showNotifications &&
        !isDraggingContextRef.current &&
        !target?.closest("[data-notifications-panel]")
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [pinnedPopoverId, showNotifications]);

  function clearPopoverCloseTimer() {
    if (popoverCloseTimerRef.current != null) {
      window.clearTimeout(popoverCloseTimerRef.current);
      popoverCloseTimerRef.current = null;
    }
  }

  function schedulePopoverClose(agentId: string) {
    clearPopoverCloseTimer();
    popoverCloseTimerRef.current = window.setTimeout(() => {
      if (isDraggingContextRef.current || pinnedPopoverId === agentId) return;
      setOpenPopoverId((current) => (current === agentId ? null : current));
    }, 220);
  }

  function openAgentPopover(agentId: string) {
    clearPopoverCloseTimer();
    if (!pinnedPopoverId) setOpenPopoverId(agentId);
  }

  function appendContextToComposer(text: string) {
    const snippet = text.trim();
    if (!snippet) return;
    setInput((current) => {
      if (!current.trim()) return snippet;
      return `${current.trim()}\n\n${snippet}`;
    });
  }

  function onNotificationDragStart(
    event: DragEvent<HTMLElement>,
    payload: { title: string; fullText: string },
  ) {
    const transfer = `${payload.title}: ${payload.fullText}`;
    event.dataTransfer.setData("text/plain", transfer);
    event.dataTransfer.setData(
      "application/x-thinkroom-context",
      JSON.stringify(payload),
    );
    event.dataTransfer.effectAllowed = "copy";
    isDraggingContextRef.current = true;
    setIsDraggingContext(true);
    // Keep notifications open while dragging toward the composer.
    setShowNotifications(true);
  }

  function onNotificationDragEnd() {
    isDraggingContextRef.current = false;
    setIsDraggingContext(false);
    setComposerDropActive(false);
  }

  function onComposerDragOver(event: DragEvent<HTMLElement>) {
    if (
      !event.dataTransfer.types.includes("text/plain") &&
      !event.dataTransfer.types.includes("application/x-thinkroom-context")
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setComposerDropActive(true);
  }

  function onComposerDragLeave(event: DragEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setComposerDropActive(false);
  }

  function onComposerDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setComposerDropActive(false);
    isDraggingContextRef.current = false;
    setIsDraggingContext(false);
    const raw =
      event.dataTransfer.getData("application/x-thinkroom-context") ||
      event.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { title?: string; fullText?: string };
      if (parsed.fullText) {
        appendContextToComposer(
          parsed.title ? `[${parsed.title}]\n${parsed.fullText}` : parsed.fullText,
        );
        return;
      }
    } catch {
      // plain text fallback
    }
    appendContextToComposer(raw);
  }

  function selectAgent(agent: Agent) {
    setActiveAgentId(agent.id);
    if (agent.interactionMode === "chat") setPanel("chat");
  }

  function renderAgentControls(agent: Agent, compact = false) {
    return (
      <div className={`agent-controls ${compact ? "is-compact" : ""}`}>
        <div
          className="mode-toggle"
          role="group"
          aria-label={`${agent.name} interaction mode`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={agent.interactionMode === "talk" ? "is-active" : ""}
            onClick={() => setAgentInteractionMode(agent.id, "talk")}
          >
            <span>Talk</span>
          </button>
          <button
            type="button"
            className={agent.interactionMode === "chat" ? "is-active" : ""}
            onClick={() => setAgentInteractionMode(agent.id, "chat")}
          >
            <span>Chat</span>
          </button>
        </div>
        <label
          className="model-select-wrap always-visible"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <span className="model-label">Model</span>
          <select
            className="model-select"
            value={agent.model}
            aria-label={`Model for ${agent.name}`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              setAgentModel(agent.id, event.target.value as AgentModelId)
            }
          >
            {AGENT_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`floor-control ${agent.id === activeAgentId ? "is-active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            selectAgent(agent);
          }}
        >
          {agent.id === activeAgentId && (
            <span className="floor-sign" aria-hidden="true" />
          )}
          <span>
            {agent.id === activeAgentId ? "Has the floor" : "Give floor"}
          </span>
        </button>
      </div>
    );
  }

  function renderRoomComposer(variant: "stage" | "panel") {
    const isPanel = variant === "panel";
    return (
      <form
        className={`room-composer ${isPanel ? "panel-composer" : ""} ${composerDropActive ? "is-drop-target" : ""} ${isDraggingContext ? "is-drop-ready" : ""}`}
        onSubmit={sendMessage}
        onDragOver={onComposerDragOver}
        onDragLeave={onComposerDragLeave}
        onDrop={onComposerDrop}
      >
        <div className="composer-heading">
          <div>
            <span className="system-label">
              {activeAgent.interactionMode === "chat" ? "Chat with" : "Ask the room"}
            </span>
            <strong className="composer-speaker-line">
              <GoldSpeakingOrb
                size="mini"
                present
                active={isAgentAudiblyActive(activeAgent)}
                label={`${activeAgent.name} is speaking`}
              />
              {activeAgent.name} · {activeAgent.interactionMode === "chat" ? "Chat mode" : "Talk mode"}
            </strong>
            {isVoicing && (
              <button
                type="button"
                className="stop-speaking-inline"
                onClick={stopSpeaking}
                aria-label="Stop AI speaking"
              >
                <Icon name="stop" />
                Stop speaking
              </button>
            )}
          </div>
          <label className="model-select-wrap composer-model always-visible">
            <span className="model-label">Model</span>
            <select
              className="model-select"
              value={activeAgent.model}
              aria-label={`Model for ${activeAgent.name}`}
              onChange={(event) =>
                setAgentModel(
                  activeAgent.id,
                  event.target.value as AgentModelId,
                )
              }
            >
              {AGENT_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={enableSearch ? "option-active" : ""} onClick={() => setEnableSearch((value) => !value)}>
            <Icon name="search" /> Web
          </button>
          <button
            type="button"
            className={researchMode ? "option-active" : ""}
            onClick={() => {
              setResearchMode((value) => !value);
              setEnableSearch(true);
            }}
          >
            <Icon name="notes" /> Research
          </button>
          <button
            type="button"
            className={attachedFiles.length ? "option-active" : ""}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add files"
          >
            <Icon name="attach" /> Files
          </button>
          {!isPanel && (
            <input
              ref={fileInputRef}
              type="file"
              className="composer-file-input"
              multiple
              accept=".txt,.md,.markdown,.csv,.json,.xml,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.yml,.yaml,.toml,.log,.sql,.sh,.env,text/plain,text/markdown,text/csv,application/json"
              onChange={(event) => void handleFilesSelected(event.target.files)}
            />
          )}
        </div>
        {composerDropActive && (
          <div className="composer-drop-hint">Drop contribution into chat</div>
        )}
        {attachedFiles.length > 0 && (
          <div className="composer-files" aria-label="Attached files">
            {attachedFiles.map((file) => (
              <div className="file-chip" key={file.id}>
                <Icon name="attach" />
                <span className="file-chip-name" title={file.name}>{file.name}</span>
                <span className="file-chip-size">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeAttachedFile(file.id)}
                >
                  <Icon name="close" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="composer-input">
          <textarea
            ref={isPanel ? panelComposerInputRef : undefined}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAgent.interactionMode === "chat"
                ? `Message ${activeAgent.name}…`
                : `Ask ${activeAgent.name}…`
            }
            rows={isPanel ? 2 : 1}
            disabled={isSending}
          />
          <button type="submit" disabled={!input.trim() || isSending}>
            <Icon name="send" />
            <span>
              {isSending
                ? "Working"
                : activeAgent.interactionMode === "chat"
                  ? "Send"
                  : "Speak"}
            </span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <main className="meet-shell">
      <header className="meet-header">
        <div className="meeting-identity">
          <span className="brand-mark" aria-hidden="true">TR</span>
          <div>
            <strong>Active meeting</strong>
            <span>Specialist meeting room</span>
          </div>
        </div>
        <div className="meeting-meta">
          <div className="notifications-anchor" data-notifications-panel ref={notificationsRef}>
            <button
              className={`notifications-control ${showNotifications ? "is-open" : ""} ${isDraggingContext ? "is-dragging" : ""}`}
              type="button"
              aria-expanded={showNotifications}
              aria-label="Meeting notifications"
              onClick={() => setShowNotifications((value) => !value)}
            >
              <Icon name="bell" />
              <span>Activity</span>
              {activityNotifications.length > 0 && (
                <b className="notifications-count">{activityNotifications.length}</b>
              )}
            </button>
            {(showNotifications || isDraggingContext) && (
              <div
                className={`notifications-panel ${isDraggingContext ? "is-drag-locked" : ""}`}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="notifications-panel-head">
                  <strong>Recent contributions</strong>
                  <span>Drag into chat to attach as context</span>
                </div>
                {activityNotifications.length === 0 ? (
                  <p className="notifications-empty">
                    Ask an expert — replies will show up here for drag-and-drop into chat.
                  </p>
                ) : (
                  <div className="notifications-list">
                    {activityNotifications.map((item) => (
                      <article
                        key={item.id}
                        className="notification-item"
                        draggable
                        onDragStart={(event) =>
                          onNotificationDragStart(event, {
                            title: item.title,
                            fullText: item.fullText,
                          })
                        }
                        onDragEnd={onNotificationDragEnd}
                        onClick={() =>
                          appendContextToComposer(
                            `[${item.title}]\n${item.fullText}`,
                          )
                        }
                      >
                        <span className="notification-kicker">{item.title}</span>
                        <p>{item.body}</p>
                        <small>Drag to chat · click to attach</small>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <label className={`notes-toggle ${takeAiNotes ? "is-on" : ""}`}>
            <input
              type="checkbox"
              checked={takeAiNotes}
              onChange={(event) => setTakeAiNotes(event.target.checked)}
            />
            <span className="notes-switch" aria-hidden="true" />
            <span>Take AI notes</span>
          </label>
          <button
            className="export-pdf-control"
            type="button"
            onClick={exportNotesPdf}
            aria-label="Export meeting notes as PDF"
          >
            <Icon name="download" />
            <span>Export PDF</span>
          </button>
          <span className="room-live"><span className="live-dot" /> Room open</span>
          <button
            className="theme-control"
            type="button"
            onClick={() => {
              setIsDarkMode(!isDarkMode);
            }}
            aria-label="Toggle theme"
          >
            <Icon name={isDarkMode ? "sun" : "moon"} />
            <span>{isDarkMode ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      <div className={`meeting-body ${panel ? "panel-open" : ""}`}>
        <section className="meeting-stage" aria-label="Meeting participants">
          <div className="room-tools">
            <div>
              <span className="system-label">In the room</span>
              <strong>{joinedAgents.length + 1} participants</strong>
            </div>
            <div className="room-register">
              {takeAiNotes && <span>AI notes on</span>}
              {attachedFiles.length > 0 && (
                <span>
                  {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"}
                </span>
              )}
              {enableSearch && <span>Web access</span>}
              {researchMode && <span>Research brief</span>}
            </div>
          </div>

          <div className="room-scroll">
            <div className="conference-roster">
              <article
                className={`human-nameplate ${isScreenSharing || !isCameraOff ? "has-video" : ""} ${isScreenSharing ? "screen-sharing" : ""} ${PREVIEW_GOLD_SPEAK || !isMuted ? "is-speaking" : ""}`}
              >
                <div className="human-seat-copy">
                  <div>
                    <span className="plate-kicker">Meeting host</span>
                    <strong>
                      <span className="speaker-avatar-wrap">
                        <span className="expert-avatar inline" aria-hidden="true">Y</span>
                        <GoldSpeakingOrb
                          size="mini"
                          active={PREVIEW_GOLD_SPEAK || !isMuted}
                          label="You are live"
                        />
                      </span>
                      You
                      <span className={`presence-dot neutral ${isMuted && !PREVIEW_GOLD_SPEAK ? "idle" : ""}`} />
                    </strong>
                    <small>
                      {isScreenSharing
                        ? "Presenting your screen"
                        : isCameraOff
                          ? "Camera off"
                          : "Camera on"}
                    </small>
                  </div>
                </div>
                {(PREVIEW_GOLD_SPEAK || (!isMuted && isCameraOff && !isScreenSharing)) && (
                  <div className="gold-speak-stage-slot" aria-hidden="true">
                    <GoldSpeakingOrb size="stage" active label="You are speaking" />
                  </div>
                )}
                <video
                  ref={videoRef}
                  className={isCameraOff && !isScreenSharing ? "camera-hidden" : ""}
                  autoPlay
                  muted
                  playsInline
                />
              </article>

              <div
                className={`expert-grid density-${expertDensity}`}
                data-count={joinedAgents.length}
              >
                {joinedAgents.map((agent) => {
                  const isActive = agent.id === activeAgentId;
                  const isSpeakingNow = isAgentAudiblyActive(agent);
                  const agentReply =
                    [...messages].reverse().find(
                      (message) =>
                        message.role === "assistant" && message.agentId === agent.id,
                    )?.content ?? "";
                  const popoverOpen = visiblePopoverId === agent.id;

                  if (expertDensity === "collapsed") {
                    return (
                      <div
                        className={`expert-pill-wrap ${agent.isCustom ? "expert-custom" : `expert-${agent.id}`} ${isActive ? "has-floor" : ""} ${isSpeakingNow ? "is-speaking" : ""} ${popoverOpen ? "is-open" : ""}`}
                        key={agent.id}
                        data-agent-popover={agent.id}
                        onMouseEnter={() => openAgentPopover(agent.id)}
                        onMouseLeave={() => schedulePopoverClose(agent.id)}
                      >
                        <button
                          type="button"
                          className="expert-pill"
                          aria-expanded={popoverOpen}
                          aria-label={`${agent.name}, ${agent.role}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectAgent(agent);
                            setPinnedPopoverId((current) =>
                              current === agent.id ? null : agent.id,
                            );
                            setOpenPopoverId(agent.id);
                          }}
                        >
                          <span className="speaker-avatar-wrap pill">
                            <span className={`expert-avatar ${agent.emoji ? "has-emoji" : ""}`} aria-hidden="true">
                              {agentMark(agent)}
                            </span>
                            <GoldSpeakingOrb
                              size="mini"
                              active={isSpeakingNow}
                              label={`${agent.name} is speaking`}
                            />
                          </span>
                          <span className="expert-pill-copy">
                            <strong>{agent.name}</strong>
                            <small>
                              {isSpeakingNow
                                ? "Speaking"
                                : isActive
                                  ? "Floor"
                                  : agent.interactionMode === "chat"
                                    ? "Chat"
                                    : "Talk"}
                            </small>
                          </span>
                          <GoldSpeakingOrb
                            size="card"
                            active={isSpeakingNow}
                            label={`${agent.name} is speaking`}
                          />
                        </button>

                        <div
                          className={`expert-popover ${popoverOpen ? "is-visible" : ""}`}
                          role="dialog"
                          aria-label={`${agent.name} controls`}
                          onClick={(event) => event.stopPropagation()}
                          onMouseEnter={() => openAgentPopover(agent.id)}
                          onMouseLeave={() => schedulePopoverClose(agent.id)}
                          onMouseDown={() => setPinnedPopoverId(agent.id)}
                        >
                          <div className="expert-popover-head">
                            <span className="speaker-avatar-wrap">
                              <span className={`expert-avatar large ${agent.emoji ? "has-emoji" : ""}`} aria-hidden="true">
                                {agentMark(agent)}
                              </span>
                              <GoldSpeakingOrb
                                size="mini"
                                active={isSpeakingNow}
                                label={`${agent.name} is speaking`}
                              />
                            </span>
                            <div>
                              <span className="plate-kicker">
                                {isSpeakingNow
                                  ? "Speaking"
                                  : isActive
                                    ? "Has the floor"
                                    : agent.isCustom
                                      ? "Custom expert"
                                      : "AI specialist"}
                              </span>
                              <strong>{agent.name}</strong>
                              <small>{agent.role}</small>
                            </div>
                            {agent.id !== HOST_AGENT.id && (
                              <button
                                className="remove-agent inline"
                                type="button"
                                aria-label={`Remove ${agent.name}`}
                                onClick={() => removeAgent(agent.id)}
                              >
                                <Icon name="close" />
                              </button>
                            )}
                          </div>
                          {isSpeakingNow && (
                            <div className="gold-speak-stage-slot compact">
                              <GoldSpeakingOrb
                                size="stage"
                                active
                                label={`${agent.name} is speaking`}
                              />
                            </div>
                          )}
                          {renderAgentControls(agent, true)}
                          <p className="expert-popover-snippet">
                            {isSpeakingNow
                              ? isSending
                                ? "Preparing a reply…"
                                : "Speaking to the room…"
                              : agentReply ||
                                "Select this specialist to give them the floor."}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <article
                      className={`expert-nameplate ${agent.isCustom ? "expert-custom" : `expert-${agent.id}`} ${isActive ? "has-floor" : ""} ${isSpeakingNow ? "is-speaking" : ""}`}
                      key={agent.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectAgent(agent)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectAgent(agent);
                        }
                      }}
                    >
                      {agent.id !== HOST_AGENT.id && (
                        <button
                          className="remove-agent"
                          type="button"
                          aria-label={`Remove ${agent.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeAgent(agent.id);
                          }}
                        >
                          <Icon name="close" />
                        </button>
                      )}
                      <div className="expert-identity">
                        <span className="plate-kicker">
                          {isSpeakingNow
                            ? "Speaking"
                            : isActive
                              ? "Has the floor"
                              : agent.isCustom
                                ? "Custom expert"
                                : "AI specialist"}
                        </span>
                        <strong>
                          <span className="speaker-avatar-wrap">
                            <span className={`expert-avatar inline ${agent.emoji ? "has-emoji" : ""}`} aria-hidden="true">
                              {agentMark(agent)}
                            </span>
                            <GoldSpeakingOrb
                              size="mini"
                              active={isSpeakingNow}
                              label={`${agent.name} is speaking`}
                            />
                          </span>
                          {agent.name}
                          {isActive && <span className="presence-dot active" />}
                        </strong>
                        <small>{agent.role}</small>
                      </div>
                      <div className="expert-response">
                        {isSpeakingNow ? (
                          <div className="gold-speak-stage-slot">
                            <GoldSpeakingOrb
                              size="stage"
                              active
                              label={`${agent.name} is speaking`}
                            />
                            <span className="gold-speak-caption">
                              {agent.interactionMode === "talk"
                                ? "Voice response"
                                : "Generating reply"}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span>
                              {agentReply ? "Latest contribution" : "At the table"}
                            </span>
                            <p>
                              {agentReply ||
                                "Select this specialist to give them the floor."}
                            </p>
                          </>
                        )}
                      </div>
                      {renderAgentControls(agent)}
                    </article>
                  );
                })}

                <button
                  className={`add-expert-nameplate ${expertDensity === "collapsed" ? "is-pill" : ""}`}
                  type="button"
                  onClick={() => setShowExpertPicker(true)}
                >
                  <Icon name="chair" />
                  <span>
                    <strong>Add AI expert</strong>
                    {expertDensity !== "collapsed" && (
                      <small>Bring another specialist to the table</small>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {mediaError && <div className="stage-toast">{mediaError}</div>}
          {error && <div className="stage-toast error">{error}</div>}

          {renderRoomComposer("stage")}
        </section>

        {panel && (
          <aside className="meeting-panel">
            <header className="panel-header">
              <div>
                <span>ThinkRoom</span>
                <h2>
                  {panel === "chat" && (
                    activeAgent.interactionMode === "chat"
                      ? `Chat · ${activeAgent.name}`
                      : "Conversation"
                  )}
                  {panel === "people" && "People & experts"}
                  {panel === "notes" && "Meeting notes"}
                  {panel === "sources" && "Sources"}
                </h2>
              </div>
              <div className="panel-header-actions">
                <button type="button" onClick={() => setPanel(null)} aria-label="Close panel"><Icon name="close" /></button>
              </div>
            </header>

            {panel === "chat" && (
              <div className={`chat-panel-body ${showChatKeyboard ? "keyboard-open" : ""}`}>
                <div className="panel-messages">
                  {messages
                    .filter((message) => {
                      if (activeAgent.interactionMode !== "chat") return true;
                      return (
                        message.role === "user" ||
                        message.agentId === activeAgent.id ||
                        message.agentId === HOST_AGENT.id
                      );
                    })
                    .map((message) => {
                      const isLiveSpeaker =
                        PREVIEW_GOLD_SPEAK ||
                        (message.role === "assistant" &&
                          message.agentId === activeAgentId &&
                          (isSending ||
                            (isVoicing && voicingAgentId === message.agentId)));
                      const messageAgent =
                        message.role === "assistant" && message.agentId
                          ? joinedAgents.find((agent) => agent.id === message.agentId) ??
                            customAgents.find((agent) => agent.id === message.agentId)
                          : undefined;
                      const avatarMark =
                        message.role === "user"
                          ? "Y"
                          : messageAgent
                            ? agentMark(messageAgent)
                            : agentInitials(message.agentName || "AI");
                      return (
                    <article key={message.id} className={`message-row ${message.role === "user" ? "message-self" : ""} ${isLiveSpeaker ? "is-live-speaker" : ""}`}>
                      <div className="message-author">
                        <span className="speaker-avatar-wrap message">
                          <span className={`message-avatar ${messageAgent?.emoji ? "has-emoji" : ""}`} aria-hidden="true">
                            {avatarMark}
                          </span>
                          <GoldSpeakingOrb
                            size="mini"
                            active={isLiveSpeaker}
                            label={`${message.agentName || "Speaker"} is speaking`}
                          />
                        </span>
                        <strong>{message.role === "user" ? "You" : message.agentName}</strong>
                        <span>{message.role === "user" ? "Host" : "AI"}</span>
                      </div>
                      <p>{message.content}</p>
                      {(message.sources?.length ?? 0) > 0 && (
                        <div className="inline-sources">
                          {message.sources!.slice(0, 3).map((source) => (
                            <a key={source.uri} href={source.uri} target="_blank" rel="noreferrer">{source.title}</a>
                          ))}
                        </div>
                      )}
                    </article>
                      );
                    })}
                  {isSending && (
                    <div className="thinking-line">
                      <GoldSpeakingOrb
                        size="mini"
                        active
                        label={`${activeAgent.name} is generating`}
                      />
                      {activeAgent.name} is speaking
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                {showChatKeyboard && renderRoomComposer("panel")}
                <div className="chat-keyboard-bar">
                  <button
                    type="button"
                    className={`chat-keyboard-toggle ${showChatKeyboard ? "is-on" : ""}`}
                    aria-label={showChatKeyboard ? "Hide keyboard" : "Show keyboard"}
                    aria-pressed={showChatKeyboard}
                    onClick={() => setShowChatKeyboard((value) => !value)}
                  >
                    <Icon name="keyboard" />
                    <span>{showChatKeyboard ? "Hide keyboard" : "Keyboard"}</span>
                  </button>
                </div>
              </div>
            )}

            {panel === "people" && (
              <div className="people-panel">
                <button className="panel-primary-button" type="button" onClick={() => setShowInvite(true)}><Icon name="personAdd" /> Add people</button>
                <h3>In this meeting · {joinedAgents.length + 1}</h3>
                <div className="person-row">
                  <span className="presence-dot neutral" />
                  <div><strong>You</strong><small>Meeting host</small></div>
                  <Icon name={isMuted ? "micOff" : "mic"} />
                </div>
                {joinedAgents.map((agent) => (
                  <div className={`person-row ${agent.isCustom ? "expert-custom" : `expert-${agent.id}`} ${agent.id === activeAgentId ? "selected" : ""}`} key={agent.id}>
                    <button type="button" className="person-row-main" onClick={() => setActiveAgentId(agent.id)}>
                      <span className={`presence-dot ${agent.id === activeAgentId ? "active" : "idle"}`} />
                      <div>
                        <strong>{agent.name}</strong>
                        <small>{agent.role}</small>
                      </div>
                      <span className="person-ai">AI</span>
                    </button>
                    {agent.id !== HOST_AGENT.id && (
                      <button
                        type="button"
                        className="remove-agent inline"
                        aria-label={`Remove ${agent.name}`}
                        onClick={() => removeAgent(agent.id)}
                      >
                        <Icon name="close" />
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-from-panel" type="button" onClick={() => setShowExpertPicker(true)}><Icon name="chair" /> Add AI expert</button>
              </div>
            )}

            {panel === "notes" && (
              <div className="notes-panel-content">
                <section>
                  <span>AI notes</span>
                  <p>
                    {takeAiNotes
                      ? "Live capture is on. Goal, decisions, and a running summary update after each exchange."
                      : "Turn on Take AI notes in the header to capture a running summary during the meeting."}
                  </p>
                  <button
                    className="panel-primary-button summarize-meeting-button"
                    type="button"
                    onClick={summarizeMeeting}
                    disabled={!canSummarizeMeeting || isSummarizing}
                    aria-busy={isSummarizing}
                  >
                    <Icon name="notes" />
                    {isSummarizing ? "Summarizing…" : "Summarize meeting"}
                  </button>
                  {!canSummarizeMeeting && (
                    <p className="summarize-hint">
                      Chat for at least one question and one reply, then summarize.
                    </p>
                  )}
                  {summaryError && (
                    <p className="summarize-error" role="alert">
                      {summaryError}
                    </p>
                  )}
                </section>
                <section><span>Goal</span><p>{memory.goal || "Ask a question to start the shared meeting memory."}</p></section>
                <section><span>Decisions</span>{memory.decisions.length ? <ul>{memory.decisions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No decisions yet.</p>}</section>
                <section><span>Open questions</span>{memory.openQuestions.length ? <ul>{memory.openQuestions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No open questions yet.</p>}</section>
                <section>
                  <span>Running summary</span>
                  <p className="summary-text">{memory.summary || "No summary beats yet."}</p>
                </section>
                <button className="panel-primary-button" type="button" onClick={exportNotesPdf}>
                  <Icon name="download" /> Export PDF
                </button>
              </div>
            )}

            {panel === "sources" && (
              <div className="sources-panel-content">
                {allSources.length === 0 ? (
                  <div className="panel-empty"><Icon name="search" /><h3>No sources yet</h3><p>Turn on Web search and ask a current question.</p></div>
                ) : allSources.map((source, index) => (
                  <a key={source.uri} href={source.uri} target="_blank" rel="noreferrer">
                    <span>{index + 1}</span>
                    <div><strong>{source.title}</strong><small>{hostnameOf(source.uri)}</small></div>
                  </a>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="meet-controls">
        <div className="control-left">
          <span className="room-avatar" aria-hidden="true">Y</span>
          <div>
            <span>Room</span>
            <strong>{roomCode}</strong>
          </div>
        </div>
        <div className="control-center">
          <button type="button" className={`meeting-control ${isMuted ? "control-off" : ""}`} onClick={toggleMute}>
            <Icon name={isMuted ? "micOff" : "mic"} /><span>{isMuted ? "Unmute" : "Mute"}</span>
          </button>
          <button type="button" className={`meeting-control ${isCameraOff ? "control-off" : ""}`} onClick={toggleCamera}>
            <Icon name={isCameraOff ? "cameraOff" : "camera"} /><span>{isCameraOff ? "Start video" : "Stop video"}</span>
          </button>
          <button type="button" className={`meeting-control ${isScreenSharing ? "control-on" : ""}`} onClick={toggleScreenShare}>
            <Icon name="screen" /><span>{isScreenSharing ? "Stop sharing" : "Share screen"}</span>
          </button>
          <button className="meeting-control" type="button" onClick={() => setShowInvite(true)}><Icon name="personAdd" /><span>Add people</span></button>
          <button className={`meeting-control desktop-control ${panel === "chat" ? "control-on" : ""}`} type="button" onClick={() => setPanel(panel === "chat" ? null : "chat")}><Icon name="chat" /><span>Conversation</span></button>
          <button className="meeting-control" type="button" onClick={() => setShowMore((value) => !value)}><Icon name="more" /><span>More</span></button>
        </div>
        <div className="control-right">
          {isVoicing && (
            <button
              type="button"
              className="meeting-control control-on stop-speaking-control"
              onClick={stopSpeaking}
              aria-label="Stop AI speaking"
            >
              <Icon name="stop" />
              <span>Stop</span>
            </button>
          )}
          <button className="leave-control" type="button" onClick={leaveMeeting}>
            <Icon name="leave" /><span>Leave</span>
          </button>
        </div>
        {showMore && (
          <div className="more-menu">
            <button type="button" onClick={() => { setPanel(panel === "chat" ? null : "chat"); setShowMore(false); }}><Icon name="chat" /> Conversation</button>
            <button type="button" onClick={() => { setPanel("notes"); setShowMore(false); }}><Icon name="notes" /> Meeting notes</button>
            <button type="button" onClick={() => { setPanel("sources"); setShowMore(false); }}><Icon name="search" /> Research sources</button>
            <button type="button" onClick={() => { setShowExpertPicker(true); setShowMore(false); }}><Icon name="chair" /> Add AI expert</button>
            <button type="button" onClick={() => { setPanel("people"); setShowMore(false); }}><Icon name="people" /> Room roster</button>
          </div>
        )}
      </footer>

      {showInvite && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowInvite(false)}>
          <section className="meeting-modal" role="dialog" aria-modal="true" aria-labelledby="invite-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setShowInvite(false)} aria-label="Close"><Icon name="close" /></button>
            <span className="modal-kicker">Invitation · People</span>
            <h2 id="invite-title">Invite people to ThinkRoom</h2>
            <p>Share this link so someone can open this meeting room on their phone or computer.</p>
            <div className="copy-link-row">
              <span>{roomUrl}</span>
              <button type="button" onClick={shareRoom}>{copied ? <Icon name="check" /> : <Icon name="link" />}{copied ? "Copied" : "Share"}</button>
            </div>
            <div className="realtime-note"><strong>Room link ready</strong><span>Human live audio/video requires a realtime calling provider before production.</span></div>
          </section>
        </div>
      )}

      {showExpertPicker && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            setShowExpertPicker(false);
            setCustomMenuId(null);
          }}
        >
          <section
            className="meeting-modal expert-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expert-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => {
                setShowExpertPicker(false);
                setCustomMenuId(null);
              }}
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
            <span className="modal-kicker">Roster · AI specialists</span>
            <h2 id="expert-title">Seat an AI expert</h2>
            <p>Every expert receives the shared context from this meeting.</p>
            <div className="expert-picker-grid">
              <button
                className="expert-picker-create"
                type="button"
                onClick={openCreateCustomExpert}
              >
                <span className="expert-picker-create-mark" aria-hidden="true">+</span>
                <span>
                  <strong>Create Custom Expert</strong>
                  <small>Define a specialist with your own instructions</small>
                </span>
              </button>

              {pickerAgents.map((agent) => {
                const isSeated = seatedIds.has(agent.id);
                return (
                  <div
                    className={`expert-picker-row ${agent.isCustom ? "is-custom expert-custom" : `expert-${agent.id}`} ${isSeated ? "is-seated" : ""}`}
                    key={agent.id}
                  >
                    <span className={`expert-avatar ${agent.emoji ? "has-emoji" : ""}`} aria-hidden="true">
                      {agentMark(agent)}
                    </span>
                    <div>
                      <div className="expert-picker-heading">
                        <strong>{agent.name}</strong>
                        {agent.isCustom && <span className="custom-expert-badge">Custom</span>}
                        {isSeated && <span className="custom-expert-badge seated">In room</span>}
                      </div>
                      <small>{agent.role}</small>
                      {!isSeated && (
                        <label className="model-select-wrap">
                          <span className="model-label">Model</span>
                          <select
                            className="model-select"
                            value={pickerModels[agent.id] ?? agent.model}
                            aria-label={`Model for ${agent.name}`}
                            onChange={(event) =>
                              setPickerModels((current) => ({
                                ...current,
                                [agent.id]: event.target.value as AgentModelId,
                              }))
                            }
                          >
                            {AGENT_MODELS.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    {agent.isCustom && (
                      <div className="expert-card-menu">
                        <button
                          className="expert-card-menu-trigger"
                          type="button"
                          aria-label={`Options for ${agent.name}`}
                          aria-expanded={customMenuId === agent.id}
                          onClick={() =>
                            setCustomMenuId((current) =>
                              current === agent.id ? null : agent.id,
                            )
                          }
                        >
                          <Icon name="more" />
                        </button>
                        {customMenuId === agent.id && (
                          <div className="expert-card-menu-panel" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openEditCustomExpert(agent)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="danger"
                              onClick={() => deleteCustomExpert(agent.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {isSeated ? (
                      <span className="expert-picker-seated" aria-hidden="true">✓</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inviteAgent(agent)}
                        aria-label={`Add ${agent.name}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
              {pickerAgents.length === 0 && (
                <p className="all-invited">
                  All available AI experts are already in the room. Create a custom expert to add another voice.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {showCustomExpertForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={closeCustomExpertForm}
        >
          <section
            className="meeting-modal custom-expert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-expert-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeCustomExpertForm}
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
            <span className="modal-kicker">
              {editingCustomId ? "Edit · Custom expert" : "Create · Custom expert"}
            </span>
            <h2 id="custom-expert-title">
              {editingCustomId ? "Edit custom AI expert" : "Create custom AI expert"}
            </h2>
            <p>
              Shape a specialist with a clear title, instructions, and voice. They’ll share this meeting’s context.
            </p>

            <div className="custom-expert-layout">
              <form
                className="custom-expert-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveCustomExpert();
                }}
              >
                <label className="custom-field">
                  <span>Expert title</span>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(event) => setCustomTitle(event.target.value)}
                    placeholder="e.g. Python Code Reviewer"
                    maxLength={60}
                    autoFocus
                  />
                </label>

                <label className="custom-field">
                  <span className="custom-field-label-row">
                    Description
                    <button
                      className="enhance-prompt-button"
                      type="button"
                      onClick={() => void enhanceCustomExpert()}
                      disabled={isEnhancingExpert || (!customTitle.trim() && !customDescription.trim())}
                    >
                      <Icon name="sparkles" />
                      {isEnhancingExpert ? "Enhancing…" : "Auto-generate"}
                    </button>
                  </span>
                  <textarea
                    value={customDescription}
                    onChange={(event) => setCustomDescription(event.target.value)}
                    placeholder="What this expert does, their goals, and how they should respond…"
                    rows={6}
                  />
                </label>

                <div className="custom-field">
                  <span>Icon</span>
                  <div className="emoji-picker" role="listbox" aria-label="Expert icon">
                    {EXPERT_EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        role="option"
                        aria-selected={customEmoji === emoji}
                        className={customEmoji === emoji ? "is-selected" : ""}
                        onClick={() => setCustomEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="custom-field">
                  <span>Tone / communication style</span>
                  <select
                    value={customTone}
                    onChange={(event) =>
                      setCustomTone(event.target.value as ExpertTone)
                    }
                  >
                    {EXPERT_TONES.map((tone) => (
                      <option key={tone.id} value={tone.id}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </label>

                {customFormError && (
                  <p className="custom-form-error" role="alert">
                    {customFormError}
                  </p>
                )}

                <div className="custom-form-actions">
                  <button
                    className="custom-form-secondary"
                    type="button"
                    onClick={closeCustomExpertForm}
                  >
                    Cancel
                  </button>
                  <button
                    className="custom-form-primary"
                    type="submit"
                    disabled={!canCreateCustomExpert}
                  >
                    {editingCustomId ? "Save changes" : "Create"}
                  </button>
                </div>
              </form>

              <aside className="custom-expert-preview" aria-live="polite">
                <span className="custom-preview-label">Gallery preview</span>
                <div className="expert-picker-row is-custom expert-custom custom-preview-card">
                  <span className="expert-avatar has-emoji" aria-hidden="true">
                    {customPreviewAgent.emoji}
                  </span>
                  <div>
                    <div className="expert-picker-heading">
                      <strong>{customPreviewAgent.name}</strong>
                      <span className="custom-expert-badge">Custom</span>
                    </div>
                    <small>{customPreviewAgent.role}</small>
                  </div>
                  <span className="custom-preview-add" aria-hidden="true">+</span>
                </div>
                <p>
                  Custom experts stay in your library on this device and can be edited or deleted anytime.
                </p>
              </aside>
            </div>
          </section>
        </div>
      )}

    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="meet-shell" aria-busy="true" />}>
      <Home />
    </Suspense>
  );
}
