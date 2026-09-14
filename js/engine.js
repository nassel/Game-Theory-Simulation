import { createInitialState as createPDState, step as pdStep } from './models/prisonerDilemma.js';
import { createInitialState as createNEState, step as neStep } from './models/nashEquilibrium.js';
import { createInitialState as createCournotState, step as cournotStep } from './models/cournot.js';

const MODELS = {
    prisonerDilemma: { create: createPDState, step: pdStep },
    nashEquilibrium: { create: createNEState, step: neStep },
    cournot: { create: createCournotState, step: cournotStep }
};

export class SimulationEngine {
    constructor() {
        this.state = null;
        this.currentGame = 'prisonerDilemma';
        this.animationId = null;
        this.lastStepTime = 0;
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    notify() {
        this.subscribers.forEach(cb => cb(this.state));
    }

    setGame(gameType, params = {}) {
        this.currentGame = gameType;
        const model = MODELS[gameType];
        if (!model) throw new Error(`Unknown game: ${gameType}`);

        this.state = model.create(params);
        this.notify();
    }

    getState() {
        return this.state;
    }

    getCurrentGame() {
        return this.currentGame;
    }

    step() {
        if (!this.state) return;
        const model = MODELS[this.currentGame];
        this.state = model.step(this.state);
        this.notify();
    }

    reset(params = {}) {
        const model = MODELS[this.currentGame];
        this.state = model.create({ ...this.getParams(), ...params });
        this.notify();
    }

    getParams() {
        if (!this.state) return {};
        const { type, round, step, isRunning, roundHistory, history, priceHistory, profitHistory, bestResponse1, bestResponse2, nashEquilibria, player1Mix, player2Mix, ...params } = this.state;
        return params;
    }

    updateParams(params) {
        if (!this.state) return;
        this.state = { ...this.state, ...params };
        this.notify();
    }

    setRunning(running) {
        if (!this.state) return;
        this.state = { ...this.state, isRunning: running };
        this.notify();
    }

    setSpeed(speed) {
        if (!this.state) return;
        this.state = { ...this.state, speed };
        this.notify();
    }

    startLoop(renderCallback) {
        const loop = (timestamp) => {
            if (!this.state?.isRunning) {
                this.animationId = requestAnimationFrame(loop);
                return;
            }

            const interval = 1000 / (this.state.speed || 10);
            if (timestamp - this.lastStepTime >= interval) {
                this.step();
                this.lastStepTime = timestamp;
            }

            renderCallback(this.state);
            this.animationId = requestAnimationFrame(loop);
        };
        this.lastStepTime = performance.now();
        this.animationId = requestAnimationFrame(loop);
    }

    stopLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

export const engine = new SimulationEngine();