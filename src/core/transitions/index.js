/* The transition vocabulary — SHOTLIST.md §4 R3.

   Five moves, used deliberately:

     gas atomize   act boundaries ONLY. Lives in core/GasTransition.js and is scheduled
                   by ShotSystem, not from here — it is the only move that operates on
                   the whole frame rather than inside a shot.
     aperture      entering a project from THE WALL
     whip-pan      between beats inside a world
     rack focus    foreground type <-> background world
     light-lead    a moving key drags the next set in

   Everything here is a pure function of a 0..1 parameter returning scalars. None of
   them touch the scene, the composer or the DOM. That is deliberate: a transition that
   owns state is a transition that can be left half-applied when the viewer scrolls
   backwards through it, and this film is entirely scrubbable. */

export { aperture } from './aperture.js';
export { whipPan } from './whipPan.js';
export { rackFocus } from './rackFocus.js';
export { lightLead } from './lightLead.js';
