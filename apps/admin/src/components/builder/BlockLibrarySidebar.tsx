"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { BLOCK_REGISTRY, type BlockDefinition } from "@marwa/builder";
import * as Icons from "lucide-react";
import { Search, X, ChevronDown, ChevronRight, SearchX, Box } from "lucide-react";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export interface BlockLibrarySidebarProps {
  onInsert: (blockType: string) => void;
  className?: string;
  previewFrameRef?: React.RefObject<HTMLIFrameElement | null>;
  canvasScale?: number;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; order: number; accentColor: string; badgeBg: string }
> = {
  layout: {
    label: "LAYOUT",
    order: 1,
    accentColor: "text-[#ffb900]",
    badgeBg: "bg-[#ffb900]/10 text-[#ffb900] border-[#ffb900]/20",
  },
  theme: {
    label: "THEME ELEMENTS",
    order: 2,
    accentColor: "text-[#ffb900]",
    badgeBg: "bg-[#ffb900]/10 text-[#ffb900] border-[#ffb900]/20",
  },
  content: {
    label: "CONTENT",
    order: 3,
    accentColor: "text-[#ffb900]",
    badgeBg: "bg-[#ffb900]/10 text-[#ffb900] border-[#ffb900]/20",
  },
  collection: {
    label: "UTILITIES & DYNAMIC",
    order: 4,
    accentColor: "text-[#ffb900]",
    badgeBg: "bg-[#ffb900]/10 text-[#ffb900] border-[#ffb900]/20",
  },
  section: {
    label: "SECTIONS",
    order: 5,
    accentColor: "text-[#ffb900]",
    badgeBg: "bg-[#ffb900]/10 text-[#ffb900] border-[#ffb900]/20",
  },
};

const BLOCK_ALIASES: Record<string, string[]> = {
  Section: ["container", "wrapper", "row", "flex", "box", "block"],
  Columns: ["grid", "layout", "flex", "col", "columns"],
  Spacer: ["space", "gap", "margin", "padding", "height"],
  Divider: ["line", "separator", "hr", "border"],
  Heading: ["title", "h1", "h2", "h3", "header", "text"],
  RichText: ["paragraph", "text", "copy", "body", "editor"],
  Image: ["photo", "picture", "media", "graphic"],
  CTAButton: ["button", "link", "cta", "action", "press"],
  Icon: ["symbol", "star", "graphic", "logo"],
  Video: ["mp4", "youtube", "vimeo", "media", "player"],
  Counter: ["stat", "number", "timer", "count", "metrics"],
  Testimonial: ["review", "quote", "feedback", "client"],
  ImageBox: ["card", "feature", "media"],
  IconBox: ["card", "feature", "service"],
  IconList: ["bullet", "list", "checks", "features"],
  Accordion: ["faq", "collapse", "expand", "toggle"],
  Tabs: ["switcher", "panel", "navigation"],
  Table: ["grid", "sheet", "matrix", "data"],
  FormBlock: ["input", "contact", "submit", "fields"],
  NavMenu: ["menu", "header", "links", "navigation"],
  SiteLogo: ["logo", "brand", "header", "identity"],
};

/** Precise Lucide Icon mapping per module type */
const BLOCK_ICON_NAME_MAP: Record<string, string> = {
  // A. Content & Core Modules
  Heading: "Type",
  RichText: "FileText",
  Image: "Image",
  CTAButton: "MousePointerClick",
  Video: "Video",
  Icon: "Sparkles",
  Counter: "Hash",
  Testimonial: "Quote",
  ImageBox: "Component",
  IconBox: "Boxes",
  IconList: "ListChecks",
  ServiceCard: "Briefcase",
  TextUnfold: "ChevronDownSquare",
  Form: "Mail",
  FormBlock: "Mail",
  AccordionItem: "HelpCircle",
  Accordion: "HelpCircle",
  Faq: "HelpCircle",
  GoogleMaps: "MapPin",
  SocialIcons: "Share2",
  Gallery: "LayoutGrid",
  Tabs: "Sliders",
  ItineraryRoadmap: "Milestone",
  Slider: "Columns",
  CarouselContainer: "Columns",
  ScrollMarquee: "Activity",
  FlipBox: "RotateCw",

  // B. Headings, Cards & Display
  BeforeAfter: "Split",
  IconBullets: "ListFilter",
  NumberBox: "ListOrdered",
  TimelineBullets: "GitCommit",
  ShapeBullets: "Shapes",
  ScrollTextAnimation: "MoveVertical",
  IconAccordion: "FolderPlus",
  StackedImages: "Layers",
  GlowingCard: "Sparkle",
  GlowingContentCard: "Sparkle",
  AdvancedHeading: "Heading",
  InfoBox: "Info",
  TeamMember: "Users",
  PriceTable: "Tag",
  PricingTable: "Tag",
  BusinessHours: "Clock",
  DualColorHeading: "Baseline",
  FancyHeading: "Sparkles",
  MarketingButton: "Zap",
  MultiButtons: "Grid",
  FAQSchema: "FileQuestion",
  CountdownTimer: "Timer",
  Hotspot: "Target",
  Table: "Table",
  TableOfContents: "ListTree",
  Blockquote: "TextQuote",
  CodeHighlight: "Code",
  ProgressTracker: "CheckCircle2",
  ContentToggle: "ToggleLeft",
  Search: "Search",
  Breadcrumbs: "ChevronRight",
  PostInfo: "UserCheck",

  // C. Interactive, Media & Integrations
  VideoPlaylist: "PlaySquare",
  LottieAnimation: "Film",
  Template: "Layout",
  ThirdPartyForm: "ExternalLink",
  PayPalButton: "CreditCard",
  StripeButton: "ShieldCheck",
  InstagramFeed: "Instagram",
  TwitterFeed: "Twitter",
  FacebookPage: "Facebook",
  DefinitionRows: "AlignLeft",

  // D. Sections & Dynamic
  TrustHighlights: "Compass",
  Testimonials: "MessageSquare",
  PillLinks: "Map",
  FeaturedRoutes: "Navigation",
  TourInfoSection: "Compass",
  Checklist: "CheckSquare",
  SiteFooter: "PanelBottom",
  ContactPage: "Send",
  ContactForm: "Send",
  CollectionList: "Database",
  LoopGrid: "Grid",
  LoopCarousel: "Repeat",
  Portfolio: "FolderGit2",
  TaxonomyFilter: "Filter",
  Posts: "Newspaper",
  MarqueeStrip: "ChevronsRight",
  ServicesCarousel: "SlidersHorizontal",
  Services: "SlidersHorizontal",
  ProcessSteps: "GitMerge",
  SiteLogo: "Shield",
  NavMenu: "Menu",
  LanguageSwitcher: "Globe",
  Section: "LayoutTemplate",
  Columns: "Columns2",
  Spacer: "MoveVertical",
  Divider: "Minus",
};

function resolveModuleIcon(blockType: string, label?: string): React.ElementType {
  const iconName = BLOCK_ICON_NAME_MAP[blockType];
  if (iconName && (Icons as unknown as Record<string, unknown>)[iconName]) {
    return (Icons as unknown as Record<string, React.ElementType>)[iconName];
  }

  // Smart fallback keyword matching
  const clean = (label || blockType).toLowerCase();
  if (clean.includes("hero")) return Icons.Maximize2;
  if (clean.includes("tour") || clean.includes("trip")) return Icons.Compass;
  if (clean.includes("map") || clean.includes("location") || clean.includes("area") || clean.includes("serve")) return Icons.MapPin;
  if (clean.includes("car") || clean.includes("fleet") || clean.includes("vehicle")) return Icons.Car;
  if (clean.includes("text") || clean.includes("copy")) return Icons.FileText;
  if (clean.includes("heading") || clean.includes("title")) return Icons.Type;
  if (clean.includes("card") || clean.includes("box")) return Icons.Component;
  if (clean.includes("list")) return Icons.ListChecks;
  if (clean.includes("button")) return Icons.MousePointerClick;
  if (clean.includes("image") || clean.includes("photo")) return Icons.Image;
  if (clean.includes("faq") || clean.includes("help") || clean.includes("question")) return Icons.HelpCircle;
  if (clean.includes("form") || clean.includes("contact")) return Icons.Mail;
  if (clean.includes("grid") || clean.includes("layout")) return Icons.LayoutGrid;
  if (clean.includes("carousel") || clean.includes("slider")) return Icons.Columns;
  if (clean.includes("star") || clean.includes("icon")) return Icons.Sparkles;

  return Box;
}

export function BlockLibrarySidebar({ onInsert, className = "", previewFrameRef, canvasScale = 1 }: BlockLibrarySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [ghost, setGhost] = useState<{ label: string; x: number; y: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // A plain click (pointerdown+up with no movement) still needs to fall
  // through to the existing onClick-to-insert behavior below — this only
  // suppresses it for the specific press that just finished an actual drag,
  // so a real drop doesn't also insert a second copy via the click that
  // naturally follows pointerup.
  const justDraggedRef = useRef(false);

  function startModuleDrag(block: BlockDefinition, downEvent: React.PointerEvent) {
    const iframe = previewFrameRef?.current;
    if (!iframe) return; // no canvas to drag into yet (e.g. page still loading)
    const startX = downEvent.clientX;
    const startY = downEvent.clientY;
    let dragging = false;
    const DRAG_THRESHOLD = 4;

    function postToIframe(action: string, extra?: Record<string, unknown>) {
      iframe?.contentWindow?.postMessage({ source: "marwa-admin", action, blockType: block.type, ...extra }, WEB_URL);
    }

    function handleMove(moveEvent: PointerEvent) {
      if (!dragging) {
        if (Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD && Math.abs(moveEvent.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        // There's no native drag session here (see the class doc comment)
        // so nothing sets a drag cursor on its own — set one manually for
        // the same "yes, this is draggable" feedback a native drag gives.
        document.body.style.cursor = "grabbing";
      }
      setGhost({ label: block.label, x: moveEvent.clientX, y: moveEvent.clientY });

      const rect = iframe!.getBoundingClientRect();
      const inside = moveEvent.clientX >= rect.left && moveEvent.clientX <= rect.right && moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom;
      if (inside) {
        // rect is the iframe's post-transform on-screen size (e.g. a 768px
        // Tablet canvas rendered at scale 0.6 measures ~460px here) — divide
        // by the same scale to convert back to the iframe's OWN internal
        // coordinate space, which is what elementFromPoint on the other end
        // (PreviewBridge.tsx) actually needs. Skipping this at any scale
        // other than 1 is what made drops land on the wrong element/
        // position — looking like insertion "stacking" or "shifting" — the
        // moment the canvas was scaled down at all (Tablet/Mobile, or
        // Desktop in a narrower-than-1280px panel).
        postToIframe("external-drag-move", {
          x: (moveEvent.clientX - rect.left) / canvasScale,
          y: (moveEvent.clientY - rect.top) / canvasScale,
        });
      } else {
        postToIframe("external-drag-clear");
      }
    }

    function handleUp(upEvent: PointerEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("keydown", handleEscape);
      setGhost(null);
      document.body.style.cursor = "";
      if (!dragging) return; // just a click — let the button's own onClick handle it

      justDraggedRef.current = true;
      const rect = iframe!.getBoundingClientRect();
      const inside = upEvent.clientX >= rect.left && upEvent.clientX <= rect.right && upEvent.clientY >= rect.top && upEvent.clientY <= rect.bottom;
      if (inside) {
        postToIframe("external-drag-drop");
      } else {
        postToIframe("external-drag-clear");
      }
    }

    function handleEscape(keyEvent: KeyboardEvent) {
      if (keyEvent.key !== "Escape") return;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("keydown", handleEscape);
      setGhost(null);
      document.body.style.cursor = "";
      if (dragging) postToIframe("external-drag-clear");
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("keydown", handleEscape);
  }

  // Global hotkey listener (⌘K or / to focus search input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA";

      if (isCmdK || isSlash) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Group blocks by category and apply live search filtering
  const { categorizedBlocks, totalCount, totalFilteredCount } = useMemo(() => {
    const allBlocks = Object.values(BLOCK_REGISTRY) as BlockDefinition[];
    const totalCount = allBlocks.length;
    const query = searchQuery.trim().toLowerCase();

    const groups: Record<string, BlockDefinition[]> = {};

    allBlocks.forEach((block) => {
      const cat = block.category || "content";

      // Filtering logic
      if (query) {
        const labelMatch = block.label.toLowerCase().includes(query);
        const typeMatch = block.type.toLowerCase().includes(query);
        const catMatch = cat.toLowerCase().includes(query);
        const aliases = BLOCK_ALIASES[block.type] || [];
        const aliasMatch = aliases.some((a) => a.toLowerCase().includes(query));

        if (!labelMatch && !typeMatch && !catMatch && !aliasMatch) {
          return;
        }
      }

      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(block);
    });

    const totalFilteredCount = Object.values(groups).reduce((acc, list) => acc + list.length, 0);

    return { categorizedBlocks: groups, totalCount, totalFilteredCount };
  }, [searchQuery]);

  // Sort categories by predefined order
  const sortedCategories = useMemo(() => {
    return Object.keys(categorizedBlocks).sort((a, b) => {
      const orderA = CATEGORY_CONFIG[a]?.order ?? 99;
      const orderB = CATEGORY_CONFIG[b]?.order ?? 99;
      return orderA - orderB;
    });
  }, [categorizedBlocks]);

  const toggleCategory = (categoryKey: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950 text-zinc-100 select-none ${className}`}>
      {ghost && (
        <div
          style={{
            position: "fixed",
            left: ghost.x + 14,
            top: ghost.y + 14,
            zIndex: 9999,
            pointerEvents: "none",
            background: "#18181b",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "#f59e0b",
            boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
          }}
        >
          + {ghost.label}
        </div>
      )}
      {/* ── Sticky Top Search Bar Header ── */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-md pt-2 pb-3 px-3 border-b border-zinc-800/80 shadow-md">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${totalCount > 0 ? `${totalCount}+` : ""} modules...`}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-7 pr-10 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 select-none rounded bg-zinc-800/90 border border-zinc-700/60 px-1 py-0.5 text-[9px] font-mono text-zinc-400 shadow-sm pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* ── Scrollable Block List Area ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {totalFilteredCount === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 my-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center mb-3 text-zinc-500 border border-zinc-700/50">
              <SearchX className="w-5 h-5 text-amber-500/80" />
            </div>
            <p className="text-xs font-semibold text-zinc-200 mb-1">No modules found</p>
            <p className="text-[11px] text-zinc-500 mb-3 max-w-[180px]">
              No modules found matching &quot;<span className="text-amber-400 font-medium">{searchQuery}</span>&quot;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95 shadow-sm"
            >
              Clear Search
            </button>
          </div>
        ) : (
          sortedCategories.map((catKey) => {
            const blocks = categorizedBlocks[catKey];
            if (!blocks || blocks.length === 0) return null;

            const catMeta = CATEGORY_CONFIG[catKey] || {
              label: catKey.toUpperCase(),
              accentColor: "text-zinc-400",
              badgeBg: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
            };

            // Force categories open when actively searching
            const isCollapsed = Boolean(searchQuery.trim() === "" && collapsedCategories[catKey]);

            return (
              <div key={catKey} className="space-y-1.5">
                {/* Accordion Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(catKey)}
                  className="flex items-center justify-between w-full px-1.5 py-1 rounded-md text-left text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 group-hover:text-zinc-200">
                      {catMeta.label}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-semibold px-1 py-0.2 rounded-full border ${catMeta.badgeBg}`}
                    >
                      {blocks.length}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                  )}
                </button>

                {/* 2-Column Block Grid */}
                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {blocks.map((block) => {
                      const IconComponent = resolveModuleIcon(block.type, block.label);

                      return (
                        <button
                          key={block.type}
                          type="button"
                          onPointerDown={(e) => startModuleDrag(block, e)}
                          onClick={() => {
                            if (justDraggedRef.current) {
                              justDraggedRef.current = false;
                              return;
                            }
                            onInsert(block.type);
                          }}
                          title={`Insert ${block.label} (Drag to canvas or click to add)`}
                          className="group relative flex flex-col items-center justify-center text-center p-2.5 rounded-xl border border-white/5 bg-[#141417] hover:bg-[#1a1a1e] hover:border-[#ffb900]/40 transition-all cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-[#ffb900]/5 select-none active:scale-[0.98]"
                        >
                          {/* Monochromatic #ffb900 Icon Badge Container */}
                          <div className="w-8 h-8 rounded-md bg-[#ffb900]/10 border border-[#ffb900]/20 flex items-center justify-center mb-2 group-hover:border-[#ffb900]/50 group-hover:bg-[#ffb900]/20 transition-colors">
                            <IconComponent className="w-4 h-4 text-[#ffb900] transition-colors" strokeWidth={1.75} />
                          </div>

                          {/* Block Label */}
                          <span className="text-[10px] font-medium text-zinc-300 group-hover:text-[#ffb900] leading-tight transition-colors line-clamp-2">
                            {block.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
