export function createInitialState(params = {}) {
    const a = params.a || 100;
    const b = params.b || 1;
    const c1 = params.c1 || 20;
    const c2 = params.c2 || 20;
    const eq = findCournotNashEquilibrium(a, b, c1, c2);
    return {
        type: 'cournot',
        a,
        b,
        c1,
        c2,
        q1: params.q1 || 20,
        q2: params.q2 || 20,
        history: [],
        priceHistory: [],
        profitHistory: [],
        nashEquilibrium: eq,
        isRunning: false,
        step: 0,
        maxSteps: params.maxSteps || 50,
        adjustmentSpeed: params.adjustmentSpeed || 0.5,
        dynamics: params.dynamics || 'bestResponse'
    };
}

export function calculatePrice(q1, q2, a, b) {
    const totalQ = q1 + q2;
    return Math.max(0, a - b * totalQ);
}

export function calculateProfit(q1, q2, a, b, c1, c2) {
    const price = calculatePrice(q1, q2, a, b);
    return [
        (price - c1) * q1,
        (price - c2) * q2
    ];
}

export function findCournotNashEquilibrium(a, b, c1, c2) {
    // Best response functions:
    // q1 = (a - c1 - b*q2) / (2b)
    // q2 = (a - c2 - b*q1) / (2b)
    // Solving simultaneously:
    const q1 = (a - 2*c1 + c2) / (3*b);
    const q2 = (a - 2*c2 + c1) / (3*b);
    const price = calculatePrice(q1, q2, a, b);
    const [profit1, profit2] = calculateProfit(q1, q2, a, b, c1, c2);

    return { q1: Math.max(0, q1), q2: Math.max(0, q2), price, profit1, profit2 };
}

export function bestResponse1(q2, a, b, c1) {
    return Math.max(0, (a - c1 - b * q2) / (2 * b));
}

export function bestResponse2(q1, a, b, c2) {
    return Math.max(0, (a - c2 - b * q1) / (2 * b));
}

export function bestResponseStep(state) {
    const { q1, q2, a, b, c1, c2, adjustmentSpeed, nashEquilibrium } = state;
    const targetQ1 = bestResponse1(q2, a, b, c1);
    const targetQ2 = bestResponse2(q1, a, b, c2);

    const newQ1 = q1 + adjustmentSpeed * (targetQ1 - q1);
    const newQ2 = q2 + adjustmentSpeed * (targetQ2 - q2);

    const price = calculatePrice(newQ1, newQ2, a, b);
    const [profit1, profit2] = calculateProfit(newQ1, newQ2, a, b, c1, c2);

    return {
        ...state,
        step: state.step + 1,
        q1: newQ1,
        q2: newQ2,
        history: [...state.history, [newQ1, newQ2]],
        priceHistory: [...state.priceHistory, price],
        profitHistory: [...state.profitHistory, [profit1, profit2]],
        nashEquilibrium,
        isRunning: state.step + 1 < state.maxSteps
    };
}

export function gradientStep(state) {
    const { q1, q2, a, b, c1, c2, adjustmentSpeed, nashEquilibrium } = state;

    // Profit functions:
    // π1 = (a - b(q1+q2) - c1) * q1
    // π2 = (a - b(q1+q2) - c2) * q2
    //
    // dπ1/dq1 = a - 2b*q1 - b*q2 - c1
    // dπ2/dq2 = a - b*q1 - 2b*q2 - c2

    const dPi1 = a - 2 * b * q1 - b * q2 - c1;
    const dPi2 = a - b * q1 - 2 * b * q2 - c2;

    const newQ1 = Math.max(0, q1 + adjustmentSpeed * dPi1);
    const newQ2 = Math.max(0, q2 + adjustmentSpeed * dPi2);

    const price = calculatePrice(newQ1, newQ2, a, b);
    const [profit1, profit2] = calculateProfit(newQ1, newQ2, a, b, c1, c2);

    return {
        ...state,
        step: state.step + 1,
        q1: newQ1,
        q2: newQ2,
        history: [...state.history, [newQ1, newQ2]],
        priceHistory: [...state.priceHistory, price],
        profitHistory: [...state.profitHistory, [profit1, profit2]],
        nashEquilibrium,
        isRunning: state.step + 1 < state.maxSteps
    };
}

export function step(state) {
    if (!state.isRunning || state.step >= state.maxSteps) {
        return { ...state, isRunning: false };
    }

    if (state.dynamics === 'gradient') {
        return gradientStep(state);
    }
    return bestResponseStep(state);
}

export function getControlsHTML() {
    return `
        <div class="control-group">
            <label>Demand Intercept (a) <span class="control-value" id="aVal">100</span></label>
            <input type="range" id="paramA" min="50" max="200" value="100">
        </div>
        <div class="control-group">
            <label>Demand Slope (b) <span class="control-value" id="bVal">1</span></label>
            <input type="range" id="paramB" min="0.5" max="5" step="0.1" value="1">
        </div>
        <div class="control-group">
            <label>Firm 1 Marginal Cost <span class="control-value" id="c1Val">20</span></label>
            <input type="range" id="paramC1" min="0" max="80" value="20">
        </div>
        <div class="control-group">
            <label>Firm 2 Marginal Cost <span class="control-value" id="c2Val">20</span></label>
            <input type="range" id="paramC2" min="0" max="80" value="20">
        </div>
        <div class="control-group">
            <label>Initial Q1 <span class="control-value" id="q1Val">20</span></label>
            <input type="range" id="initQ1" min="0" max="100" value="20">
        </div>
        <div class="control-group">
            <label>Initial Q2 <span class="control-value" id="q2Val">20</span></label>
            <input type="range" id="initQ2" min="0" max="100" value="20">
        </div>
        <div class="control-group">
            <label>Dynamics</label>
            <select id="dynamics">
                <option value="bestResponse">Best Response</option>
                <option value="gradient">Gradient Adjustment</option>
            </select>
        </div>
        <div class="control-group">
            <label>Adjustment Speed <span class="control-value" id="adjSpeedVal">0.5</span></label>
            <input type="range" id="adjustmentSpeed" min="0.1" max="1" step="0.05" value="0.5">
        </div>
        <div class="control-group">
            <label>Max Steps <span class="control-value" id="maxStepsVal">50</span></label>
            <input type="range" id="maxSteps" min="10" max="200" value="50">
        </div>
        <h3 style="margin-top: 16px;">Cournot-Nash Equilibrium</h3>
        <div id="equilibriumInfo" style="font-size:0.75rem; color:#aaa;"></div>
    `;
}

export function bindControls(state, dispatch) {
    const bindParam = (id, valId, key, formatter = v => v) => {
        const el = document.getElementById(id);
        const valEl = document.getElementById(valId);
        if (el && valEl) {
            el.addEventListener('input', () => {
                const val = parseFloat(el.value);
                valEl.textContent = formatter(val);
                dispatch({ type: 'UPDATE_PARAMS', params: { [key]: val } });
            });
        }
    };

    bindParam('paramA', 'aVal', 'a');
    bindParam('paramB', 'bVal', 'b', v => v.toFixed(1));
    bindParam('paramC1', 'c1Val', 'c1');
    bindParam('paramC2', 'c2Val', 'c2');
    bindParam('initQ1', 'q1Val', 'q1');
    bindParam('initQ2', 'q2Val', 'q2');
    bindParam('adjustmentSpeed', 'adjSpeedVal', 'adjustmentSpeed', v => v.toFixed(2));
    bindParam('maxSteps', 'maxStepsVal', 'maxSteps');

    document.getElementById('dynamics').addEventListener('change', (e) => {
        dispatch({ type: 'UPDATE_PARAMS', params: { dynamics: e.target.value } });
    });

    updateEquilibriumDisplay(state);
}

export function updateEquilibriumDisplay(state) {
    const container = document.getElementById('equilibriumInfo');
    if (!container) return;

    const eq = findCournotNashEquilibrium(state.a, state.b, state.c1, state.c2);
    container.innerHTML = `
        Q1* = ${eq.q1.toFixed(2)}<br>
        Q2* = ${eq.q2.toFixed(2)}<br>
        Price = ${eq.price.toFixed(2)}<br>
        Profit1 = ${eq.profit1.toFixed(2)}<br>
        Profit2 = ${eq.profit2.toFixed(2)}
    `;
}

export function getLegendData() {
    return [
        { label: 'Firm 1 Quantity', color: '#00d4aa' },
        { label: 'Firm 2 Quantity', color: '#ffaa00' },
        { label: 'Market Price', color: '#ff4466' },
        { label: 'Nash Equilibrium', color: '#8844ff' }
    ];
}