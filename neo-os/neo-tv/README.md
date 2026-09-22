# NEO Movies

NEO Movies is the lightweight, original cinema interface built into NEO OS.

- local profiles with no sign-in
- profile-specific My List and continue-watching progress
- theme synchronization with NEO OS
- lazy catalog rows and images
- embedded movie and series playback through VidFast
- native playback for open films, with a no-restart desktop pop-out
- a lazy-loaded movie and television library backed by public catalog metadata
- an offline catalog snapshot for direct `file://` NEO OS launches
- session-local playback of videos uploaded by the user

Catalog titles use their public TMDB identifiers to launch the VidFast player inside NEO Movies. Direct local launches fall back to 894 cached movie and series entries when the live metadata service cannot be reached. The bundled open films continue to use direct native video streams, and uploads stay local to the current browser session.
