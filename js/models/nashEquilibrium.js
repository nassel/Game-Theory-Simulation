export function createInitialState(params = {}) {
    const matrix = params.payoffMatrix || generateRandomMatrix(params.numStrategies || 3);
    const n = params.numStrategies || 3;
    return {
        type: 'nashEquilibrium',
        numStrategies: n,
        payoffMatrix: matrix,
        player1Mix: params.player1Mix || Array(n).fill(0).map((_, i) => i === 0 ? 1 : 0),
        player2Mix: params.player2Mix || Array(n).fill(0).map((_, i) => i === 0 ? 1 : 0),
        nashEquilibria: computeNashEquilibria(matrix),
        bestResponse1: [],
        bestResponse2: [],
        isRunning: false,
        step: 0,
        maxSteps: params.maxSteps || 100,
        learningRate: params.learningRate || 0.1,
        dynamics: params.dynamics || 'fictitious'
    };
}

export function computeNashEquilibria(matrix) {
    const pure = findPureNashEquilibria(matrix);
    const mixed = findMixedNashEquilibrium(matrix);
    return [...pure, ...(mixed || [])];
}

function generateRandomMatrix(n) {
    const matrix = [];
    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            matrix[i][j] = [
                Math.floor(Math.random() * 10),
                Math.floor(Math.random() * 10)
            ];
        }
    }
    return matrix;
}

export function calculateExpectedPayoff(matrix, mix1, mix2, player) {
    let payoff = 0;
    for (let i = 0; i < mix1.length; i++) {
        for (let j = 0; j < mix2.length; j++) {
            payoff += mix1[i] * mix2[j] * matrix[i][j][player];
        }
    }
    return payoff;
}

export function findPureNashEquilibria(matrix) {
    const n = matrix.length;
    const equilibria = [];

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let isNE = true;
            const [p1Payoff, p2Payoff] = matrix[i][j];

            for (let i2 = 0; i2 < n; i2++) {
                if (matrix[i2][j][0] > p1Payoff) { isNE = false; break; }
            }
            for (let j2 = 0; j2 < n; j2++) {
                if (matrix[i][j2][1] > p2Payoff) { isNE = false; break; }
            }

            if (isNE) equilibria.push({ p1: i, p2: j, type: 'pure' });
        }
    }
    return equilibria;
}

export function findMixedNashEquilibrium(matrix) {
    const n = matrix.length;
    if (n !== 2) return null;

    const [[a11, a12], [a21, a22]] = [
        [matrix[0][0][0], matrix[0][1][0]],
        [matrix[1][0][0], matrix[1][1][0]]
    ];
    const [[b11, b12], [b21, b22]] = [
        [matrix[0][0][1], matrix[0][1][1]],
        [matrix[1][0][1], matrix[1][1][1]]
    ];

    const denom1 = (a11 - a12 - a21 + a22);
    const denom2 = (b11 - b12 - b21 + b22);

    if (Math.abs(denom1) < 1e-9 || Math.abs(denom2) < 1e-9) return null;

    const p = (a22 - a12) / denom1;
    const q = (b22 - b12) / denom2;

    if (p >= 0 && p <= 1 && q >= 0 && q <= 1) {
        return [{ p1: p, p2: q, type: 'mixed' }];
    }
    return null;
}

export function calculateBestResponses(matrix, mix1, mix2) {
    const n = matrix.length;
    const br1 = [];
    const br2 = [];

    for (let i = 0; i < n; i++) {
        let payoff1 = 0;
        for (let j = 0; j < n; j++) {
            payoff1 += mix2[j] * matrix[i][j][0];
        }
        br1.push(payoff);
    }

    for (let j = 0; j < n; j++) {
        let payoff2 = 0;
        for (let i = 0; i < n; i++) {
            payoff2 += mix1[i] * matrix[i][j][1];
        }
        br2.push(payoff);
    }

    const max1 = Math.max(...br1);
    const max2 = Math.max(...br2);

    return br1.map((v, i) => ({ index: i, payoff: v, isBest: Math.abs(v - max1) < 1e-9 }))
        .concat(br2.map((v, j) => ({ index: j, payoff: v, isBest: Math.abs(v - max2) < 1e-9, player: 2 })));
}

export function fictitiousPlayStep(state) {
    const { payoffMatrix, player1Mix, player2Mix, step, learningRate } = state;
    const n = payoffMatrix.length;

    const br1 = [];
    const br2 = [];

    for (let i = 0; i < n; i++) {
        let payoff = 0;
        for (let j = 0; j < n; j++) {
            payoff += player2Mix[j] * payoffMatrix[i][j][0];
        }
        br1.push(payoff);
    }

    for (let j = 0; j < n; j++) {
        let payoff = 0;
        for (let i = 0; i < n; i++) {
            payoff += player1Mix[i] * payoffMatrix[i][j][1];
        }
        br2.push(payoff);
    }

    const best1 = br1.indexOf(Math.max(...br1));
    const best2 = br2.indexOf(Math.max(...br2));

    const newMix1 = [...player1Mix];
    const newMix2 = [...player2Mix];

    for (let i = 0; i < n; i++) {
        const target = i === best1 ? 1 : 0;
        newMix1[i] += learningRate * (target - newMix1[i]);
    }
    for (let j = 0; j < n; j++) {
        const target = j === best2 ? 1 : 0;
        newMix2[j] += learningRate * (target - newMix2[j]);
    }

    const sum1 = newMix1.reduce((a, b) => a + b, 0);
    const sum2 = newMix2.reduce((a, b) => a + b, 0);

    return {
        ...state,
        step: step + 1,
        player1Mix: newMix1.map(v => v / sum1),
        player2Mix: newMix2.map(v => v / sum2),
        bestResponse1: br1,
        bestResponse2: br2,
        isRunning: step + 1 < state.maxSteps
    };
}

export function replicatorDynamicsStep(state) {
    const { payoffMatrix, player1Mix, player2Mix, step, learningRate } = state;
    const n = payoffMatrix.length;

    const payoffs1 = [];
    const payoffs2 = [];

    for (let i = 0; i < n; i++) {
        let payoff = 0;
        for (let j = 0; j < n; j++) {
            payoff += player2Mix[j] * payoffMatrix[i][j][0];
        }
        payoffs1.push(payoff);
    }

    for (let j = 0; j < n; j++) {
        let payoff = 0;
        for (let i = 0; i < n; i++) {
            payoff += player1Mix[i] * payoffMatrix[i][j][1];
        }
        payoffs2.push(payoff);
    }

    const avgPayoff1 = payoffs1.reduce((sum, p, i) => sum + p * player1Mix[i], 0);
    const avgPayoff2 = payoffs2.reduce((sum, p, j) => sum + p * player2Mix[j], 0);

    const newMix1 = player1Mix.map((p, i) => p + learningRate * p * (payoffs1[i] - avgPayoff1));
    const newMix2 = player2Mix.map((p, j) => p + learningRate * p * (payoffs2[j] - avgPayoff2));

    const sum1 = newMix1.reduce((a, b) => a + b, 0);
    const sum2 = newMix2.reduce((a, b) => a + b, 0);

    return {
        ...state,
        step: step + 1,
        player1Mix: newMix1.map(v => Math.max(0, v / sum1)),
        player2Mix: newMix2.map(v => Math.max(0, v / sum2)),
        bestResponse1: payoffs1,
        bestResponse2: payoffs2,
        isRunning: step + 1 < state.maxSteps
    };
}

export function step(state) {
    if (!state.isRunning || state.step >= state.maxSteps) {
        return { ...state, isRunning: false };
    }

    if (state.dynamics === 'replicator') {
        return replicatorDynamicsStep(state);
    }
    return fictitiousPlayStep(state);
}

export function getControlsHTML() {
    return `
        <div class="control-group">
            <label>Matrix Size <span class="control-value" id="matrixSizeVal">3</span></label>
            <input type="range" id="matrixSize" min="2" max="5" value="3">
        </div>
        <div class="control-group">
            <label>Dynamics</label>
            <select id="dynamics">
                <option value="fictitious">Fictitious Play</option>
                <option value="replicator">Replicator Dynamics</option>
            </select>
        </div>
        <div class="control-group">
            <label>Learning Rate <span class="control-value" id="lrVal">0.1</span></label>
            <input type="range" id="learningRate" min="0.01" max="0.5" step="0.01" value="0.1">
        </div>
        <div class="control-group">
            <label>Max Steps <span class="control-value" id="maxStepsVal">100</span></label>
            <input type="range" id="maxSteps" min="10" max="500" value="100">
        </div>
        <div class="control-group">
            <button id="randomizeMatrix" class="btn" style="width: 100%;">🎲 Randomize Matrix</button>
        </div>
        <h3 style="margin-top: 16px;">Payoff Matrix (P1, P2)</h3>
        <div id="matrixEditor"></div>
    `;
}

export function bindControls(state, dispatch) {
    document.getElementById('matrixSize').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('matrixSizeVal').textContent = val;
        dispatch({ type: 'RESIZE_MATRIX', size: val });
    });

    document.getElementById('dynamics').addEventListener('change', (e) => {
        dispatch({ type: 'UPDATE_PARAMS', params: { dynamics: e.target.value } });
    });

    document.getElementById('learningRate').addEventListener('input', (e) => {
        document.getElementById('lrVal').textContent = parseFloat(e.target.value).toFixed(2);
        dispatch({ type: 'UPDATE_PARAMS', params: { learningRate: parseFloat(e.target.value) } });
    });

    document.getElementById('maxSteps').addEventListener('input', (e) => {
        document.getElementById('maxStepsVal').textContent = e.target.value;
        dispatch({ type: 'UPDATE_PARAMS', params: { maxSteps: parseInt(e.target.value) } });
    });

    document.getElementById('randomizeMatrix').addEventListener('click', () => {
        dispatch({ type: 'RANDOMIZE_MATRIX' });
    });

    renderMatrixEditor(state);
}

function renderMatrixEditor(state) {
    const container = document.getElementById('matrixEditor');
    if (!container) return;

    const n = state.numStrategies;
    let html = '<table style="width:100%; border-collapse:collapse; font-size:0.7rem;">';
    html += '<tr><th></th>';
    for (let j = 0; j < n; j++) html += `<th>P2:${j}</th>`;
    html += '</tr>';

    for (let i = 0; i < n; i++) {
        html += `<tr><th>P1:${i}</th>`;
        for (let j = 0; j < n; j++) {
            const [p1, p2] = state.payoffMatrix[i][j];
            html += `<td style="padding:4px; text-align:center; border:1px solid #3a3a5a;">
                <input type="number" value="${p1}" data-i="${i}" data-j="${j}" data-player="0" style="width:40px; padding:2px; background:#222; border:1px solid #3a3a5a; color:#eee; border-radius:3px;">
                <input type="number" value="${p2}" data-i="${i}" data-j="${j}" data-player="1" style="width:40px; padding:2px; background:#222; border:1px solid #3a3a5a; color:#eee; border-radius:3px;">
            </td>`;
        }
        html += '</tr>';
    }
    html += '</table>';
    container.innerHTML = html;

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            const i = parseInt(e.target.dataset.i);
            const j = parseInt(e.target.dataset.j);
            const player = parseInt(e.target.dataset.player);
            const val = parseInt(e.target.value);
            const newMatrix = state.payoffMatrix.map((row, ri) =>
                row.map((cell, ci) => ri === i && ci === j ? [...cell] : cell)
            );
            newMatrix[i][j][player] = val;
            dispatch({ type: 'UPDATE_MATRIX', matrix: newMatrix });
        });
    });
}

export function getLegendData() {
    return [
        { label: 'Player 1 Strategy', color: '#00d4aa' },
        { label: 'Player 2 Strategy', color: '#ffaa00' },
        { label: 'Nash Equilibrium', color: '#ff4466' }
    ];
}