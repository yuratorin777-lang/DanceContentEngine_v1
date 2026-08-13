# RADAR SOURCE STRATEGY v1

Do not hard-code a giant website list into the engine.

Source classes:
1. LOCAL — municipal portals, cultural institutions, sports organisations, local media, directories, public communities.
2. DANCE — federations, championship organisers, dance organisations, competition calendars, reputable dance media.
3. SCIENCE/HEALTH — scientific publications, medical institutions, public health organisations, universities.
4. PARENTING/EDUCATION — recognised educational and child-development sources.
5. DISCOVERY — general news, RSS, search/discovery feeds and other broad sources.

A source definition should contain:
- name;
- URL/feed/API;
- class;
- collection method;
- frequency;
- parser;
- default confidence;
- topic scope.

Reuse the BOS collector/orchestrator pattern where useful, but do not copy BOS's AI/technology keywords, scoring or output semantics.
