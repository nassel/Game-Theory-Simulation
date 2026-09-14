# Game Theory Simulation

An interactive web-based simulation for visualizing game theory concepts including:
- **Prisoner's Dilemma** - Iterated cooperation/defection with multiple strategies
- **Nash Equilibrium** - Normal-form games with fictitious play and replicator dynamics
- **Cournot Competition** - Duopoly quantity competition with best-response and gradient dynamics

## Features

- Interactive parameter controls (sliders, dropdowns)
- Real-time visualization of strategy evolution
- Step-by-step simulation control (play/pause/step/reset)
- Adjustable simulation speed
- Payoff matrix editors with Nash equilibrium highlighting

## Running the Simulation

Simply open `index.html` in a modern web browser. No build step or server required.

```bash
# Option 1: Open directly
open index.html

# Option 2: Serve with a local server (recommended for modules)
npx serve .
# or
python -m http.server 8000
```

## Controls

| Control | Description |
|---------|-------------|
| **Game Selector** | Switch between Prisoner's Dilemma, Nash Equilibrium, and Cournot |
| **Play/Pause** | Start/stop automatic simulation |
| **Step** | Advance one iteration manually |
| **Reset** | Restart simulation with current parameters |
| **Speed Slider** | Adjust simulation speed (1-60 steps/second) |

### Prisoner's Dilemma
- **Strategies**: Tit for Tat, Always Cooperate, Always Defect, Tit for Two Tats, Grim Trigger, Pavlov, Random
- **Payoffs**: Adjust T (Temptation), R (Reward), P (Punishment), S (Sucker)
- **Visualization**: Strategy history over rounds, cumulative scores

### Nash Equilibrium
- **Matrix Size**: 2x2 to 5x5 normal-form games
- **Dynamics**: Fictitious Play or Replicator Dynamics
- **Learning Rate**: Adjust convergence speed
- **Visualization**: Payoff matrix with NE highlighting, mixed strategy bars, best response charts

### Cournot Competition
- **Parameters**: Demand intercept (a), slope (b), marginal costs (c1, c2)
- **Dynamics**: Best Response or Gradient Adjustment
- **Visualization**: Quantity evolution, price path, Cournot-Nash equilibrium lines

## Architecture

```
js/
├── app.js              # Main application, UI wiring
├── engine.js           # Simulation engine, game loop
├── renderer.js         # Canvas rendering for all games
└── models/
    ├── prisonerDilemma.js
    ├── nashEquilibrium.js
    └── cournot.js
```

Each game model exports:
- `createInitialState(params)` - Factory for initial state
- `step(state)` - Single simulation step
- `getControlsHTML()` - HTML for parameter controls
- `bindControls(state, dispatch)` - Event binding for controls
- `getLegendData()` - Legend items for visualization