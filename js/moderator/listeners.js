import { db, ref, fbGet, onValue } from "../core/firebase.js";
import { gameRef, orgRef } from "../core/paths.js";
import { gameStore, buildFilteredQuestions } from "./game.js";

export function initListeners(callbacks = {}) {
  const {
    onQuestionsLoaded,
    onConnectionsUpdated,
    onAnswersUpdated
  } = callbacks;

  // Questions listener
  onValue(orgRef('questions'), snap => {
    const data = snap.val() || {};
    if (Object.keys(data).length) {
      applyQuestions(data, onQuestionsLoaded);
    } else {
      fbGet(ref(db, 'questions')).then(legacy => applyQuestions(legacy.val() || {}, onQuestionsLoaded));
    }
  });

  // Connections listener
  const knownConns = new Set();
  onValue(gameRef('connections'), snap => {
    const conns = snap.val() || {};
    if (onConnectionsUpdated) onConnectionsUpdated(conns, knownConns);
  });

  // Answers listener
  onValue(gameRef('answers'), snap => {
    const all = snap.val() || {};
    if (onAnswersUpdated) onAnswersUpdated(all);
  });
}

function applyQuestions(data, callback) {
  gameStore.questions = Object.entries(data).map(([id, q]) => ({ id, ...q })).sort((a, b) => (a.order || 0) - (b.order || 0));
  buildFilteredQuestions();
  if (callback) callback();
}
