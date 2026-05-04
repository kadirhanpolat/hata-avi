import { onValue, fbGet } from "../core/firebase.js";
import { gameRef } from "../core/paths.js";
import { applyGameMode, updateStreakBadge, updateScoreAnimated } from "./ui.js";
import { playerStore, updateScoringProfile } from "./game.js";

export function initListeners(callbacks = {}) {
  const {
    onPhaseChanged,
    onTimerUpdated,
    onRoundUpdated,
    onThemeChanged,
    onTeamModeChanged
  } = callbacks;

  // Mode & Scoring
  onValue(gameRef('mode'), snap => {
    const m = snap.val() || 'academy';
    applyGameMode(m);
    updateScoringProfile(m);
  });

  // Theme
  onValue(gameRef('theme'), snap => {
    if (onThemeChanged) onThemeChanged(snap.val() || 'classic');
  });

  // Phase
  onValue(gameRef('phase'), snap => {
    if (onPhaseChanged) onPhaseChanged(snap.val());
  });

  // Timer
  onValue(gameRef('timer'), snap => {
    if (onTimerUpdated) onTimerUpdated(snap.val());
  });

  // Round
  onValue(gameRef('currentRound'), snap => {
    if (onRoundUpdated) onRoundUpdated(snap.val());
  });

  // Team Mode
  onValue(gameRef('teamMode'), snap => {
    if (onTeamModeChanged) onTeamModeChanged(snap.val());
  });

  // Analytics / Results listener for current user (optional if needed)
}
