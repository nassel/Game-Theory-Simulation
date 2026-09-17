import { createInitialState, step, getStrategyMove, calculatePayoff } from './js/models/prisonerDilemma.js';
import { calculateBestResponses, computeNashEquilibria, findMixedNashEquilibrium, createInitialState as createNE, step as neStep } from './js/models/nashEquilibrium.js';
import { createInitialState as createCournot, step as cournotStep, findCournotNashEquilibrium as findCNE } from './js/models/cournot.js';

let fails = 0;
const ok = (name, cond, extra='') => {
    if (!cond) { fails++; console.log(`FAIL: ${name} ${extra}`); }
    else console.log(`PASS: ${name}`);
};

// --- Prisoner's Dilemma ---
const pd = createInitialState({ maxRounds: 5 });
pd.isRunning = true;
let s = pd;
for (let i = 0; i < 5; i++) s = step(s);
ok('PD runs 5 rounds', s.round === 5, `round=${s.round}`);
ok('PD both players have history', s.players[0].history.length === 5 && s.players[1].history.length === 5);
ok('PD TFT vs TFT cooperates throughout', s.players[0].history.every(m => m === 'C'));

// Pavlov vs Always Defect: with P=1 < R=3, Pavlov oscillates C/D (correct Pavlov behavior).
// Verify it doesn't crash and produces a mix that includes defection.
const pav = createInitialState({ maxRounds: 6, p1Strategy: 'PAVLOV', p2Strategy: 'ALWAYS_DEFECT' });
pav.isRunning = true;
let ps = pav;
for (let i = 0; i < 6; i++) ps = step(ps);
ok('Pavlov vs AlwaysDefect defects sometimes', ps.players[0].history.includes('D'), JSON.stringify(ps.players[0].history));

// Pavlov vs Always Cooperate: should keep cooperating (payoff R >= R)
const pav2 = createInitialState({ maxRounds: 4, p1Strategy: 'PAVLOV', p2Strategy: 'ALWAYS_COOPERATE' });
pav2.isRunning = true;
let ps2 = pav2;
for (let i = 0; i < 4; i++) ps2 = step(ps2);
ok('Pavlov vs AlwaysCooperate cooperates throughout', ps2.players[0].history.every(m => m === 'C'), JSON.stringify(ps2.players[0].history));

// Payoffs respected
const custom = createInitialState({ maxRounds: 1, p1Strategy: 'ALWAYS_DEFECT', p2Strategy: 'ALWAYS_COOPERATE', payoffs: { T: 9, R: 3, P: 1, S: 0 } });
custom.isRunning = true;
const afterOne = step(custom);
ok('PD custom payoff T applied', afterOne.players[0].score === 9, `score=${afterOne.players[0].score}`);

// --- Nash Equilibrium ---
const ne = createNE({ numStrategies: 2, payoffMatrix: [[[3,3],[0,5]],[[5,0],[1,1]]] });
const eqs = computeNashEquilibria(ne.payoffMatrix);
ok('NE finds (D,D) pure equilibrium', eqs.some(e => e.type === 'pure' && e.p1 === 1 && e.p2 === 1), JSON.stringify(eqs));

// Matching pennies: row player wants to match, column wants to mismatch -> mixed NE at p=q=0.5
const mixed = findMixedNashEquilibrium([[[1,-1],[-1,1]],[[-1,1],[1,-1]]]);
ok('NE mixed exists for matching pennies', mixed !== null && Math.abs(mixed[0].p1 - 0.5) < 1e-9, JSON.stringify(mixed));

// best responses must not throw
const br = calculateBestResponses(ne.payoffMatrix, [1,0], [0,1]);
ok('calculateBestResponses runs', Array.isArray(br) && br.length === 4);

const ne2 = createNE({ numStrategies: 3 });
ne2.isRunning = true;
let nes = ne2;
for (let i = 0; i < 10; i++) nes = neStep(nes);
ok('NE steps run', nes.step === 10);
const sum = nes.player1Mix.reduce((a,b)=>a+b,0);
ok('NE mix sums to 1', Math.abs(sum - 1) < 1e-6, sum.toFixed(6));

// --- Cournot ---
const c = createCournot({});
ok('Cournot computes Nash equilibrium on init', c.nashEquilibrium !== null);
const eq = findCNE(100, 1, 20, 20);
// q1 = (a - 2c1 + c2)/(3b) = (100-40+20)/3 = 26.667
ok('Cournot eq q1=q2=(a-2c1+c2)/3b', Math.abs(eq.q1 - 80/3) < 1e-9 && Math.abs(eq.q2 - 80/3) < 1e-9, `q1=${eq.q1}, q2=${eq.q2}`);

c.isRunning = true;
let cs = c;
for (let i = 0; i < 30; i++) cs = cournotStep(cs);
ok('Cournot converges to eq', Math.abs(cs.q1 - 80/3) < 0.5 && Math.abs(cs.q2 - 80/3) < 0.5, `q1=${cs.q1.toFixed(2)}, q2=${cs.q2.toFixed(2)}`);
// price = a - b(q1+q2) = 100 - 53.33 = 46.67
ok('Cournot price converges', Math.abs(cs.priceHistory[cs.priceHistory.length-1] - (100 - 2*80/3)) < 1, `price=${cs.priceHistory[cs.priceHistory.length-1].toFixed(2)}`);

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);