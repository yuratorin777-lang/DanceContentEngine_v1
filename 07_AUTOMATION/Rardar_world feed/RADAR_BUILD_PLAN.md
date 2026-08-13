# RADAR ENGINE BUILD PLAN v1

## Step 1 — architecture
Use:
- generic engine;
- World Feed + targeted Radar;
- topic profile;
- geographic layers;
- stable item schema;
- source registry.

## Step 2 — one vertical slice
Build only:
source → collect → normalize → classify → store → inspect.

## Step 3 — small source set
Start with a few:
- local Serpukhov sources;
- dance/competition sources;
- one science/health source;
- one broad discovery source.

Do not start with dozens of collectors.

## Step 4 — AI classification
AI may classify/summarize, but source evidence remains the truth.

## Step 5 — daily schedule
Start once daily. Later add source-specific frequency and event monitoring.

## Step 6 — integration
Radar → Knowledge → Content Engine.

Never connect Radar directly to publication.

## BOS reuse
Conceptually reuse the existing BOS:
- World Feed;
- real source collectors;
- orchestrator;
- daily scan;
- intelligence/classification;
- validation;
- history/provenance.

Only the engine pattern is reused. BOS's subject-specific semantics stay in BOS.
