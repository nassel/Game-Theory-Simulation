import { engine } from './engine.js';
import { Renderer } from './renderer.js';
import * as PD from './models/prisonerDilemma.js';
import * as NE from './models/nashEquilibrium.js';
import * as Cournot from './models/cournot.js';

const MODEL_MODULES = {
    prisonerDilemma: PD,
    nashEquilibrium: NE,
    cournot: Cournot
};

const canvas = document.getElementById('simCanvas');
const renderer = new Renderer(canvas);
const controlsPanel = document.getElementById('controlsPanel');
const gameSelect = document.getElementById('gameSelect');
const statusText = document.getElementById('statusText');
const speedLabel = document.getElementById('speedLabel');
const speedSlider = document.getElementById('speedSlider');

let currentModel = null;
let unsubscribe = null;

function init() {
    setupEventListeners();
    engine.setGame('prisonerDilemma');
    unsubscribe = engine.subscribe(onStateChange);
    engine.startLoop(render);
    window.addEventListener('resize', () => renderer.resize());
}

function setupEventListeners() {
    gameSelect.addEventListener('change', (e) => {
        switchGame(e.target.value);
    });

    document.getElementById('btnPlay').addEventListener('click', () => {
        engine.setRunning(true);
        updatePlayPauseButtons();
    });

    document.getElementById('btnPause').addEventListener('click', () => {
        engine.setRunning(false);
        updatePlayPauseButtons();
    });

    document.getElementById('btnStep').addEventListener('click', () => {
        engine.step();
    });

    document.getElementById('btnReset').addEventListener('click', () => {
        engine.reset();
    });

    speedSlider.addEventListener('input', (e) => {
        const speed = parseInt(e.target.value);
        speedLabel.textContent = `${speed}/s`;
        engine.setSpeed(speed);
    });
}

function switchGame(gameType) {
    engine.setGame(gameType);
    currentModel = MODEL_MODULES[gameType];
    renderControls(gameType);
    updatePlayPauseButtons();
    statusText.textContent = `Switched to ${gameSelect.options[gameSelect.selectedIndex].text}`;
}

function renderControls(gameType) {
    const model = MODEL_MODULES[gameType];
    controlsPanel.innerHTML = model.getControlsHTML();
    const state = engine.getState();
    model.bindControls(state, dispatch);
}

function dispatch(action) {
    const state = engine.getState();
    if (!state) return;

    switch (action.type) {
        case 'UPDATE_PARAMS': {
            let params = action.params;
            if (state.type === 'cournot' && (params.a || params.b || params.c1 || params.c2)) {
                const a = params.a ?? state.a;
                const b = params.b ?? state.b;
                const c1 = params.c1 ?? state.c1;
                const c2 = params.c2 ?? state.c2;
                params = { ...params, nashEquilibrium: Cournot.findCournotNashEquilibrium(a, b, c1, c2) };
            }
            engine.updateParams(params);
            break;
        }
        case 'UPDATE_MATRIX': {
            const newMatrix = action.matrix;
            const nashEquilibria = NE.computeNashEquilibria(newMatrix);
            engine.updateParams({ payoffMatrix: newMatrix, nashEquilibria });
            break;
        }
        case 'RESIZE_MATRIX': {
            const newSize = action.size;
            const oldMatrix = state.payoffMatrix;
            const newMatrix = [];
            for (let i = 0; i < newSize; i++) {
                newMatrix[i] = [];
                for (let j = 0; j < newSize; j++) {
                    newMatrix[i][j] = oldMatrix[i]?.[j] || [Math.floor(Math.random()*10), Math.floor(Math.random()*10)];
                }
            }
            const nashEquilibria = NE.computeNashEquilibria(newMatrix);
            engine.updateParams({ numStrategies: newSize, payoffMatrix: newMatrix, player1Mix: Array(newSize).fill(1/newSize), player2Mix: Array(newSize).fill(1/newSize), nashEquilibria });
            break;
        }
        case 'RANDOMIZE_MATRIX': {
            const n = state.numStrategies;
            const newMatrix = [];
            for (let i = 0; i < n; i++) {
                newMatrix[i] = [];
                for (let j = 0; j < n; j++) {
                    newMatrix[i][j] = [Math.floor(Math.random()*10), Math.floor(Math.random()*10)];
                }
            }
            const nashEquilibria = NE.computeNashEquilibria(newMatrix);
            engine.updateParams({ payoffMatrix: newMatrix, nashEquilibria });
            break;
        }
    }
}

function onStateChange(state) {
    if (!state) return;
    currentModel = MODEL_MODULES[state.type];
    updateStatus(state);
    renderer.drawLegend(currentModel.getLegendData());
}

function updateStatus(state) {
    let msg = '';
    switch (state.type) {
        case 'prisonerDilemma':
            msg = `Round ${state.round}/${state.maxRounds} | P1: ${state.players[0].score} | P2: ${state.players[1].score}`;
            break;
        case 'nashEquilibrium':
            msg = `Step ${state.step}/${state.maxSteps} | P1 Mix: [${state.player1Mix.map(v=>v.toFixed(2)).join(', ')}] | P2 Mix: [${state.player2Mix.map(v=>v.toFixed(2)).join(', ')}]`;
            break;
        case 'cournot':
            msg = `Step ${state.step}/${state.maxSteps} | Q1: ${state.q1.toFixed(2)} | Q2: ${state.q2.toFixed(2)} | Price: ${(state.priceHistory[state.priceHistory.length-1] || 0).toFixed(2)}`;
            break;
    }
    statusText.textContent = msg;
    updatePlayPauseButtons();
}

function updatePlayPauseButtons() {
    const state = engine.getState();
    const isRunning = state?.isRunning;
    document.getElementById('btnPlay').disabled = isRunning;
    document.getElementById('btnPause').disabled = !isRunning;
}

function render(state) {
    renderer.render(state);
}

document.addEventListener('DOMContentLoaded', init);