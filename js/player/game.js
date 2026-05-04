import { db, ref, fbSet, fbUpdate, fbPush, onDisconnect, fbRemove, fbGet } from "../core/firebase.js";
import { gameRef, roomId } from "../core/paths.js";
import { playerProfile, getDeviceUID, saveProfile, awardBadge } from "./profile.js";
import { updateScoreAnimated, updateStreakBadge } from "./ui.js";

export const playerStore = {
  playerName: '',
  playerUID: null,
  myScore: 0,
  selOpt: -1,
  answered: false,
  playerTeam: '',
  playerStreak: 0,
  jokerUsed: false,
  hintUsed: false,
  curRoundIdx: -1,
  roundDur: 60,
  curQType: 'multiple',
  multiSelOpts: [],
  ordPlayerSeq: [],
  reactionSignalTs: null,
  reactionAnswered: false,
  activeScoring: { base: 1.0, streakMult: 1.2, hintPenalty: 5, speedWeight: 1.0 }
};

const SCORING_PROFILES = {
  academy:  { base: 1.0, streakMult: 1.2, hintPenalty: 5,  speedWeight: 1.0 },
  showtime: { base: 1.2, streakMult: 1.3, hintPenalty: 10, speedWeight: 1.2 },
  turbo:    { base: 1.5, streakMult: 1.5, hintPenalty: 20, speedWeight: 1.5 }
};

export function updateScoringProfile(m) {
  playerStore.activeScoring = SCORING_PROFILES[m] || SCORING_PROFILES.showtime;
}

export async function joinGame(name, pin, avatar, team, callbacks = {}) {
  const { onSuccess, onError, onKicked } = callbacks;
  
  const apSnap = await fbGet(gameRef('pin'));
  const ap = apSnap.val();
  if (ap && pin !== ap) {
    if (onError) onError('❌ Parola yanlış.');
    return;
  }

  playerStore.playerName = name;
  playerStore.playerTeam = team;
  const myUID = getDeviceUID();
  
  const cr = fbPush(gameRef('connections'));
  playerStore.playerUID = cr.key;

  await fbSet(cr, {
    name,
    avatar,
    team: team || '',
    uid: myUID,
    joinedAt: Date.now(),
    roomId
  });

  onDisconnect(cr).remove();

  if (onSuccess) onSuccess(playerStore.playerUID);

  // Monitor kicked status
  const connRef = gameRef('connections/' + playerStore.playerUID);
  import("../core/firebase.js").then(({ onValue }) => {
    onValue(connRef, s => {
      const data = s.val();
      if (data && data.kicked) {
        if (onKicked) onKicked();
        fbRemove(connRef);
      }
    });
  });
}

export async function submitAnswer(roundData, elapsed) {
  if (playerStore.answered) return;
  playerStore.answered = true;

  const isCorrect = playerStore.selOpt === roundData.correctIndex;
  const pts = calculatePoints(isCorrect, elapsed, roundData.diff);

  await fbSet(gameRef(`answers/${roundData.index}/${playerStore.playerUID}`), {
    name: playerStore.playerName,
    uid: getDeviceUID(),
    opt: playerStore.selOpt,
    correct: isCorrect,
    pts: pts,
    elapsed: elapsed,
    streak: playerStore.playerStreak,
    hintUsed: playerStore.hintUsed,
    jokerUsed: playerStore.jokerUsed
  });

  updatePlayerScore(pts, isCorrect);
}

export async function submitNumeric(roundData, val, elapsed) {
  if (playerStore.answered) return;
  playerStore.answered = true;

  const diff = Math.abs(val - roundData.numericAnswer);
  const isExact = diff === 0;
  const isClose = !isExact && diff <= (roundData.numericTolerance || 5);
  const pts = calculatePoints(isExact || isClose, elapsed, roundData.diff, isExact ? 1 : 0.5);

  await fbSet(gameRef(`answers/${roundData.index}/${playerStore.playerUID}`), {
    name: playerStore.playerName,
    uid: getDeviceUID(),
    numericVal: val,
    correct: isExact || isClose,
    isExact,
    pts: pts,
    elapsed: elapsed
  });

  updatePlayerScore(pts, isExact || isClose);
}

export async function submitOrdering(roundData, seq, elapsed) {
  if (playerStore.answered) return;
  playerStore.answered = true;

  const correctSeq = (roundData.options || []).map((_, i) => i);
  const isCorrect = JSON.stringify(seq) === JSON.stringify(correctSeq);
  const pts = calculatePoints(isCorrect, elapsed, roundData.diff);

  await fbSet(gameRef(`answers/${roundData.index}/${playerStore.playerUID}`), {
    name: playerStore.playerName,
    uid: getDeviceUID(),
    orderSeq: seq,
    correct: isCorrect,
    pts: pts,
    elapsed: elapsed
  });

  updatePlayerScore(pts, isCorrect);
}

export async function submitOpenEnded(roundData, text) {
  if (playerStore.answered) return;
  playerStore.answered = true;

  await fbSet(gameRef(`answers/${roundData.index}/${playerStore.playerUID}`), {
    name: playerStore.playerName,
    uid: getDeviceUID(),
    textAnswer: text,
    approved: null, // Pending moderator approval
    pts: 0
  });
}

function calculatePoints(isCorrect, elapsed, diff, accuracyMod = 1.0) {
  if (!isCorrect) return 0;
  const diffMult = { easy: 1, mid: 1.5, hard: 2, vhard: 3 }[diff] || 1;
  const profile = playerStore.activeScoring;
  
  // Base points: 100
  let pts = 100 * profile.base * diffMult * accuracyMod;
  
  // Speed bonus
  const timeBonus = Math.max(0, (playerStore.roundDur - elapsed) / playerStore.roundDur) * 50 * profile.speedWeight;
  pts += timeBonus;

  // Streak bonus
  if (playerStore.playerStreak >= 3) {
    pts *= profile.streakMult;
  }

  // Hint penalty
  if (playerStore.hintUsed) {
    pts -= profile.hintPenalty;
  }

  return Math.round(pts);
}

export function updatePlayerScore(pts, isCorrect) {
  if (isCorrect) {
    playerStore.myScore += pts;
    playerStore.playerStreak++;
    if (playerStore.playerStreak > playerStore.sessionStats.bestStreak) playerStore.sessionStats.bestStreak = playerStore.playerStreak;
    playerStore.sessionStats.correct++;
  } else {
    playerStore.playerStreak = 0;
  }
  if (playerStore.sessionStats) playerStore.sessionStats.total++;
  
  updateScoreAnimated(playerStore.myScore, pts);
  updateStreakBadge(playerStore.playerStreak);
}


export async function submitMultiSelect(roundData, selOpts, elapsed) {
  if (playerStore.answered) return;
  playerStore.answered = true;

  const opts = roundData.options || [];
  const correctIndices = [];
  opts.forEach((o, i) => { if(o.isCorrect) correctIndices.push(i); });
  
  const isCorrect = (selOpts.length === correctIndices.length) && 
                    selOpts.every(val => correctIndices.includes(val));
                    
  const pts = calculatePoints(isCorrect, elapsed, roundData.diff);

  await fbSet(gameRef(`answers/${roundData.index}/${playerStore.playerUID}`), {
    name: playerStore.playerName,
    uid: getDeviceUID(),
    selectedIndices: selOpts,
    correct: isCorrect,
    pts: pts,
    elapsed: elapsed,
    isMultiSelect: true
  });

  updatePlayerScore(pts, isCorrect);
}

export async function submitReaction(roundData, ms) {
  if (playerStore.answered) return;
  playerStore.answered = true;
  playerStore.reactionAnswered = true;

  const maxPts = Math.round(100 * (activeScoring.base * activeScoring.speedWeight));
  const pts = Math.max(0, Math.round(maxPts * (1 - ms / 8000)));

  await fbSet(gameRef(`answers/${roundData.index}/${playerStore.playerUID}`), {
    name: playerStore.playerName,
    uid: getDeviceUID(),
    reactionMs: ms,
    pts: pts,
    correct: true,
    tappedAt: Date.now()
  });

  updatePlayerScore(pts, true);
  return pts;
}

export function useJoker(curCorrectIndex, curOptCount, onHide) {
  if (playerStore.jokerUsed || playerStore.answered || curCorrectIndex < 0) return;
  playerStore.jokerUsed = true;

  const wrongOpts = [];
  for (let i = 0; i < curOptCount; i++) { if (i !== curCorrectIndex) wrongOpts.push(i); }
  if (wrongOpts.length <= 1) return;

  const shuffled = wrongOpts.sort(() => Math.random() - 0.5);
  const toHide = shuffled.slice(0, shuffled.length - 1);
  if (onHide) toHide.forEach(onHide);
}

export function useHint(onShow) {
  if (playerStore.hintUsed || playerStore.answered) return;
  playerStore.hintUsed = true;
  if (onShow) onShow();
}
