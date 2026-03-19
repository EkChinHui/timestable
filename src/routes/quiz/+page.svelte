<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Feedback from '$lib/components/Feedback.svelte';
  import { loadMatrix, saveMatrix, recordAnswer, getSessionCount, incrementSessionCount } from '$lib/stores/performance';
  import { loadSessionSettings, saveCurrentSession } from '$lib/stores/session';
  import { selectQuestion } from '$lib/engine/question';
  import type { SessionSettings, SessionAnswer, PerformanceMatrix } from '$lib/types';

  let settings: SessionSettings = $state({ mode: 'random', count: 20 });
  let matrix: PerformanceMatrix = $state({} as PerformanceMatrix);
  let questionNum = $state(0);
  let a = $state(0);
  let b = $state(0);
  let displayInput = $state('');
  let userInput = $derived<number | null>(displayInput === '' ? null : Number(displayInput));
  let showFeedback = $state(false);
  let lastCorrect = $state(false);
  let lastCorrectAnswer = $state(0);
  let questionStartTime = $state(0);
  let elapsed = $state(0);
  let timerInterval: ReturnType<typeof setInterval> | undefined;
  let answers: SessionAnswer[] = $state([]);
  let recentPairs: [number, number][] = $state([]);
  let inputEl: HTMLInputElement | undefined = $state();

  onMount(() => {
    const loaded = loadSessionSettings();
    if (!loaded) { goto(`${base}/`); return; }
    settings = loaded;
    matrix = loadMatrix();
    nextQuestion();
    return () => clearInterval(timerInterval);
  });

  function nextQuestion() {
    questionNum++;
    const sessionCount = getSessionCount();
    const [qa, qb] = selectQuestion(
      settings.mode, matrix, sessionCount, recentPairs, settings.table
    );
    a = qa;
    b = qb;
    recentPairs = [...recentPairs, [Math.min(a, b), Math.max(a, b)]].slice(-3);
    displayInput = '';
    showFeedback = false;
    questionStartTime = Date.now();
    elapsed = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsed = (Date.now() - questionStartTime) / 1000;
    }, 100);
    setTimeout(() => inputEl?.focus(), 10);
  }

  function submit() {
    if (userInput === null || isNaN(userInput) || showFeedback) return;
    clearInterval(timerInterval);
    const timeMs = Date.now() - questionStartTime;
    const correctAnswer = a * b;
    const isCorrect = userInput === correctAnswer;

    recordAnswer(matrix, a, b, isCorrect, timeMs);
    saveMatrix(matrix);

    answers = [...answers, {
      a, b,
      userAnswer: userInput!,
      correctAnswer,
      correct: isCorrect,
      timeMs
    }];

    lastCorrect = isCorrect;
    lastCorrectAnswer = correctAnswer;
    showFeedback = true;

    const delay = isCorrect ? 400 : 1500;
    setTimeout(() => {
      if (questionNum >= settings.count) {
        finishSession();
      } else {
        nextQuestion();
      }
    }, delay);
  }

  function padDigit(d: number) {
    if (showFeedback) return;
    if (displayInput.length >= 3) return;
    displayInput += d;
    inputEl?.focus();
  }

  function padBackspace() {
    if (showFeedback) return;
    displayInput = displayInput.slice(0, -1);
    inputEl?.focus();
  }

  function finishSession() {
    incrementSessionCount();
    const totalTime = answers.reduce((s, ans) => s + ans.timeMs, 0);
    const score = answers.filter(ans => ans.correct).length;
    saveCurrentSession({
      score,
      total: answers.length,
      avgTime: Math.round(totalTime / answers.length),
      answers
    });
    goto(`${base}/results`);
  }

</script>

<div class="quiz">
  <div class="header">
    <span>Question {questionNum} / {settings.count}</span>
    <span class="timer">{elapsed.toFixed(1)}s</span>
  </div>

  <ProgressBar current={questionNum - (showFeedback ? 0 : 1)} total={settings.count} />

  {#if showFeedback}
    <div class="question-area">
      <div class="question">{a} × {b} = {lastCorrectAnswer}</div>
      <Feedback correct={lastCorrect} correctAnswer={lastCorrectAnswer} />
    </div>
  {:else}
    <form class="question-area" onsubmit={(e) => { e.preventDefault(); submit(); }}>
      <div class="question">{a} × {b} = ?</div>
      <input
        bind:this={inputEl}
        bind:value={displayInput}
        type="text"
        inputmode="none"
        placeholder="..."
        class="answer-input"
        oninput={(e) => {
          const el = e.currentTarget;
          el.value = el.value.replace(/[^0-9]/g, '').slice(0, 3);
          displayInput = el.value;
        }}
      />
      <div class="numpad">
        {#each [1,2,3,4,5,6,7,8,9] as d}
          <button type="button" class="pad-btn" onclick={() => padDigit(d)}>{d}</button>
        {/each}
        <button type="button" class="pad-btn pad-back" onclick={padBackspace}>&larr;</button>
        <button type="button" class="pad-btn" onclick={() => padDigit(0)}>0</button>
        <button type="submit" class="pad-btn pad-enter">OK</button>
      </div>
    </form>
  {/if}
</div>

<style>
  .quiz {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-top: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .timer {
    font-variant-numeric: tabular-nums;
  }

  .question-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding-top: 3rem;
  }

  .question {
    font-size: 2.8rem;
    font-weight: 700;
  }

  .answer-input {
    font-size: 1.4rem;
    width: 120px;
    text-align: center;
    padding: 0.75rem;
  }

  .answer-input::-webkit-inner-spin-button,
  .answer-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .answer-input[type='number'] {
    -moz-appearance: textfield;
  }

  .numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    width: 100%;
    max-width: 260px;
  }

  .pad-btn {
    font-size: 1.4rem;
    font-weight: 600;
    padding: 0.85rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    user-select: none;
    -webkit-user-select: none;
  }

  .pad-btn:active {
    background: var(--border);
  }

  .pad-back {
    color: var(--text-secondary);
  }

  .pad-enter {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .pad-enter:active {
    background: var(--accent-hover);
  }
</style>
