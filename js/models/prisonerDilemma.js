export const DEFAULT_PAYOFFS = {
    T: 5,  // Temptation
    R: 3,  // Reward
    P: 1,  // Punishment
    S: 0   // Sucker
};

export const STRATEGIES = {
    COOPERATE: 'C',
    DEFECT: 'D'
};

export function createInitialState(params = {}) {
    const payoffs = { ...DEFAULT_PAYOFFS, ...params.payoffs };
    return {
        type: 'prisonerDilemma',
        payoffs,
        round: 0,
        maxRounds: params.maxRounds || 20,
        players: [
            { id: 0, strategy: params.p1Strategy || 'TIT_FOR_TAT', history: [], score: 0 },
            { id: 1, strategy: params.p2Strategy || 'TIT_FOR_TAT', history: [], score: 0 }
        ],
        roundHistory: [],
        isRunning: false,
        speed: params.speed || 10
    };
}

export function getStrategyMove(strategy, opponentHistory, round) {
    switch (strategy) {
        case 'ALWAYS_COOPERATE':
            return STRATEGIES.COOPERATE;
        case 'ALWAYS_DEFECT':
            return STRATEGIES.DEFECT;
        case 'TIT_FOR_TAT':
            return round === 0 ? STRATEGIES.COOPERATE : opponentHistory[round - 1] || STRATEGIES.COOPERATE;
        case 'TIT_FOR_TWO_TATS':
            if (round < 2) return STRATEGIES.COOPERATE;
            const lastTwo = opponentHistory.slice(-2);
            return lastTwo.every(m => m === STRATEGIES.DEFECT) ? STRATEGIES.DEFECT : STRATEGIES.COOPERATE;
        case 'RANDOM':
            return Math.random() < 0.5 ? STRATEGIES.COOPERATE : STRATEGIES.DEFECT;
        case 'GRIM_TRIGGER':
            return opponentHistory.includes(STRATEGIES.DEFECT) ? STRATEGIES.DEFECT : STRATEGIES.COOPERATE;
        case 'PAVLOV':
            if (round === 0) return STRATEGIES.COOPERATE;
            const myLast = round > 0 ? 'self' : STRATEGIES.COOPERATE;
            const oppLast = opponentHistory[round - 1];
            const payoff = getPayoff(myLast, oppLast);
            return payoff >= 3 ? myLast : (myLast === STRATEGIES.COOPERATE ? STRATEGIES.DEFECT : STRATEGIES.COOPERATE);
        default:
            return STRATEGIES.COOPERATE;
    }
}

function getPayoff(myMove, oppMove) {
    if (myMove === STRATEGIES.COOPERATE && oppMove === STRATEGIES.COOPERATE) return DEFAULT_PAYOFFS.R;
    if (myMove === STRATEGIES.COOPERATE && oppMove === STRATEGIES.DEFECT) return DEFAULT_PAYOFFS.S;
    if (myMove === STRATEGIES.DEFECT && oppMove === STRATEGIES.COOPERATE) return DEFAULT_PAYOFFS.T;
    return DEFAULT_PAYOFFS.P;
}

export function calculatePayoff(move1, move2, payoffs) {
    if (move1 === STRATEGIES.COOPERATE && move2 === STRATEGIES.COOPERATE) return [payoffs.R, payoffs.R];
    if (move1 === STRATEGIES.COOPERATE && move2 === STRATEGIES.DEFECT) return [payoffs.S, payoffs.T];
    if (move1 === STRATEGIES.DEFECT && move2 === STRATEGIES.COOPERATE) return [payoffs.T, payoffs.S];
    return [payoffs.P, payoffs.P];
}

export function step(state) {
    if (!state.isRunning || state.round >= state.maxRounds) {
        return { ...state, isRunning: false };
    }

    const p1 = state.players[0];
    const p2 = state.players[1];

    const move1 = getStrategyMove(p1.strategy, p2.history, state.round);
    const move2 = getStrategyMove(p2.strategy, p1.history, state.round);

    const [payoff1, payoff2] = calculatePayoff(move1, move2, state.payoffs);

    const newP1 = { ...p1, history: [...p1.history, move1], score: p1.score + payoff1 };
    const newP2 = { ...p2, history: [...p2.history, move2], score: p2.score + payoff2 };

    const roundData = {
        round: state.round,
        moves: [move1, move2],
        payoffs: [payoff1, payoff2],
        cumulativeScores: [newP1.score, newP2.score]
    };

    return {
        ...state,
        round: state.round + 1,
        players: [newP1, newP2],
        roundHistory: [...state.roundHistory, roundData],
        isRunning: state.round + 1 < state.maxRounds
    };
}

export function getControlsHTML() {
    return `
        <div class="control-group">
            <label>P1 Strategy <span class="control-value" id="p1StrategyVal">TIT_FOR_TAT</span></label>
            <select id="p1Strategy">
                <option value="TIT_FOR_TAT">Tit for Tat</option>
                <option value="ALWAYS_COOPERATE">Always Cooperate</option>
                <option value="ALWAYS_DEFECT">Always Defect</option>
                <option value="TIT_FOR_TWO_TATS">Tit for Two Tats</option>
                <option value="GRIM_TRIGGER">Grim Trigger</option>
                <option value="PAVLOV">Pavlov</option>
                <option value="RANDOM">Random</option>
            </select>
        </div>
        <div class="control-group">
            <label>P2 Strategy <span class="control-value" id="p2StrategyVal">TIT_FOR_TAT</span></label>
            <select id="p2Strategy">
                <option value="TIT_FOR_TAT">Tit for Tat</option>
                <option value="ALWAYS_COOPERATE">Always Cooperate</option>
                <option value="ALWAYS_DEFECT">Always Defect</option>
                <option value="TIT_FOR_TWO_TATS">Tit for Two Tats</option>
                <option value="GRIM_TRIGGER">Grim Trigger</option>
                <option value="PAVLOV">Pavlov</option>
                <option value="RANDOM">Random</option>
            </select>
        </div>
        <div class="control-group">
            <label>Max Rounds <span class="control-value" id="maxRoundsVal">20</span></label>
            <input type="range" id="maxRounds" min="5" max="100" value="20">
        </div>
        <div class="control-group">
            <label>T (Temptation) <span class="control-value" id="tVal">5</span></label>
            <input type="range" id="payoffT" min="0" max="10" step="0.5" value="5">
        </div>
        <div class="control-group">
            <label>R (Reward) <span class="control-value" id="rVal">3</span></label>
            <input type="range" id="payoffR" min="0" max="10" step="0.5" value="3">
        </div>
        <div class="control-group">
            <label>P (Punishment) <span class="control-value" id="pVal">1</span></label>
            <input type="range" id="payoffP" min="0" max="10" step="0.5" value="1">
        </div>
        <div class="control-group">
            <label>S (Sucker) <span class="control-value" id="sVal">0</span></label>
            <input type="range" id="payoffS" min="0" max="10" step="0.5" value="0">
        </div>
        <h3 style="margin-top: 16px;">Payoff Matrix</h3>
        <div class="payoff-matrix" id="payoffMatrix"></div>
    `;
}

export function bindControls(state, dispatch) {
    const updateValue = (id, valId, formatter = v => v) => {
        const el = document.getElementById(id);
        const valEl = document.getElementById(valId);
        if (el && valEl) {
            el.addEventListener('input', () => {
                valEl.textContent = formatter(el.value);
                dispatch({ type: 'UPDATE_PARAMS', params: { [id]: el.value } });
            });
        }
    };

    updateValue('p1Strategy', 'p1StrategyVal');
    updateValue('p2Strategy', 'p2StrategyVal');
    updateValue('maxRounds', 'maxRoundsVal');
    updateValue('payoffT', 'tVal');
    updateValue('payoffR', 'rVal');
    updateValue('payoffP', 'pVal');
    updateValue('payoffS', 'sVal');

    ['payoffT', 'payoffR', 'payoffP', 'payoffS'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => updatePayoffMatrix(state));
        }
    });

    document.getElementById('p1Strategy').addEventListener('change', (e) => {
        dispatch({ type: 'UPDATE_PARAMS', params: { p1Strategy: e.target.value } });
    });
    document.getElementById('p2Strategy').addEventListener('change', (e) => {
        dispatch({ type: 'UPDATE_PARAMS', params: { p2Strategy: e.target.value } });
    });
    document.getElementById('maxRounds').addEventListener('input', (e) => {
        dispatch({ type: 'UPDATE_PARAMS', params: { maxRounds: parseInt(e.target.value) } });
    });

    updatePayoffMatrix(state);
}

function updatePayoffMatrix(state) {
    const container = document.getElementById('payoffMatrix');
    if (!container) return;

    const T = parseFloat(document.getElementById('payoffT')?.value || state.payoffs.T);
    const R = parseFloat(document.getElementById('payoffR')?.value || state.payoffs.R);
    const P = parseFloat(document.getElementById('payoffP')?.value || state.payoffs.P);
    const S = parseFloat(document.getElementById('payoffS')?.value || state.payoffs.S);

    const isNash = (move1, move2) => {
        const [p1, p2] = calculatePayoff(move1, move2, { T, R, P, S });
        const alt1 = calculatePayoff(move1 === 'C' ? 'D' : 'C', move2, { T, R, P, S })[0];
        const alt2 = calculatePayoff(move1, move2 === 'C' ? 'D' : 'C', { T, R, P, S })[1];
        return p1 >= alt1 && p2 >= alt2;
    };

    container.innerHTML = `
        <div class="payoff-cell header"></div>
        <div class="payoff-cell header">C</div>
        <div class="payoff-cell header">D</div>
        <div class="payoff-cell header">C</div>
        <div class="payoff-cell ${isNash('C','C') ? 'nash' : ''}">${R}, ${R}</div>
        <div class="payoff-cell ${isNash('C','D') ? 'nash' : ''}">${S}, ${T}</div>
        <div class="payoff-cell header">D</div>
        <div class="payoff-cell ${isNash('D','C') ? 'nash' : ''}>${T}, ${S}</div>
        <div class="payoff-cell ${isNash('D','D') ? 'nash' : ''}>${P}, ${P}</div>
    `;
}

export function getLegendData() {
    return [
        { label: 'Cooperate', color: '#00d4aa' },
        { label: 'Defect', color: '#ff4466' }
    ];
}