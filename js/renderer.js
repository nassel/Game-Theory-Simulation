export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.dpr = window.devicePixelRatio || 1;
        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
    }

    clear() {
        this.ctx.fillStyle = '#0f1419';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    render(state) {
        this.clear();
        if (!state) return;

        switch (state.type) {
            case 'prisonerDilemma':
                this.renderPrisonerDilemma(state);
                break;
            case 'nashEquilibrium':
                this.renderNashEquilibrium(state);
                break;
            case 'cournot':
                this.renderCournot(state);
                break;
        }
    }

    renderPrisonerDilemma(state) {
        const { roundHistory, players, round, maxRounds, payoffs } = state;
        const padding = 40;
        const chartWidth = this.width - padding * 2;
        const chartHeight = this.height - padding * 2 - 60;

        this.drawAxes(padding, padding, chartWidth, chartHeight, maxRounds, Math.max(payoffs.T, payoffs.R, payoffs.P, payoffs.S) * 2);

        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding + chartHeight * 0.5);
        this.ctx.lineTo(padding + chartWidth, padding + chartHeight * 0.5);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        if (players[0].history.length > 0) {
            players.forEach((player, idx) => {
                const color = idx === 0 ? '#00d4aa' : '#ffaa00';
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();

                player.history.forEach((move, r) => {
                    const x = padding + (r / Math.max(1, maxRounds - 1)) * chartWidth;
                    const y = padding + chartHeight - (move === 'C' ? 0.75 : 0.25) * chartHeight;
                    if (r === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                });
                this.ctx.stroke();
            });
        } else {
            this.ctx.fillStyle = '#555';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Press Play or Step to start simulation', this.width / 2, padding + chartHeight / 2);
            this.ctx.textAlign = 'left';
        }

        this.drawScoreChart(padding, padding + chartHeight + 70, chartWidth, 50, players);
    }

    renderNashEquilibrium(state) {
        const { payoffMatrix, player1Mix, player2Mix, bestResponse1, bestResponse2, nashEquilibria, numStrategies } = state;
        const padding = 50;
        const matrixSize = Math.min(this.width, this.height) - padding * 2;
        const cellSize = matrixSize / numStrategies;

        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let i = 0; i < numStrategies; i++) {
            for (let j = 0; j < numStrategies; j++) {
                const x = padding + j * cellSize;
                const y = padding + i * cellSize;
                const [p1, p2] = payoffMatrix[i][j];
                const isNE = nashEquilibria.some(eq =>
                    (eq.type === 'pure' && eq.p1 === i && eq.p2 === j) ||
                    (eq.type === 'mixed' && Math.abs(eq.p1 - i/numStrategies) < 0.1 && Math.abs(eq.p2 - j/numStrategies) < 0.1)
                );

                this.ctx.fillStyle = isNE ? '#1a3a2e' : '#22223b';
                this.ctx.fillRect(x, y, cellSize, cellSize);
                this.ctx.strokeStyle = isNE ? '#00d4aa' : '#3a3a5a';
                this.ctx.strokeRect(x, y, cellSize, cellSize);

                this.ctx.fillStyle = isNE ? '#00ffcc' : '#eaeaea';
                this.ctx.fillText(`${p1}, ${p2}`, x + cellSize/2, y + cellSize/2);
            }
        }

        this.drawStrategyBars(padding, padding + matrixSize + 20, matrixSize, 60, player1Mix, player2Mix, numStrategies);
        this.drawBestResponseChart(padding + matrixSize + 20, padding, 150, matrixSize, bestResponse1, bestResponse2, numStrategies);
    }

    renderCournot(state) {
        const { history, priceHistory, profitHistory, q1, q2, nashEquilibrium, step, maxSteps, a, b } = state;
        const padding = 50;
        const chartWidth = this.width - padding * 2;
        const chartHeight = (this.height - padding * 3) / 2;

        if (history.length === 0) {
            this.ctx.fillStyle = '#555';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Press Play or Step to start simulation', this.width / 2, this.height / 2);
            this.ctx.textAlign = 'left';
            return;
        }

        this.drawAxes(padding, padding, chartWidth, chartHeight, maxSteps, Math.max(a, ...history.flat()));
        this.drawQuantityChart(padding, padding, chartWidth, chartHeight, history, nashEquilibrium);

        this.drawAxes(padding, padding + chartHeight + 40, chartWidth, chartHeight, maxSteps, Math.max(a, ...priceHistory));
        this.drawPriceChart(padding, padding + chartHeight + 40, chartWidth, chartHeight, priceHistory, nashEquilibrium);
    }

    drawAxes(x, y, width, height, maxX, maxY) {
        this.ctx.strokeStyle = '#3a3a5a';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + height);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.stroke();

        this.ctx.fillStyle = '#888';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const val = (maxY * i / 5).toFixed(1);
            const yy = y + height - (i / 5) * height;
            this.ctx.fillText(val, x - 25, yy + 3);
            this.ctx.beginPath();
            this.ctx.moveTo(x - 3, yy);
            this.ctx.lineTo(x, yy);
            this.ctx.stroke();
        }
        this.ctx.textAlign = 'left';
    }

    drawQuantityChart(x, y, width, height, history, nash) {
        if (history.length < 2) return;

        const maxQ = Math.max(...history.flat(), nash?.q1 || 0, nash?.q2 || 0) * 1.1;

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#00d4aa';
        this.ctx.lineWidth = 2;
        history.forEach(([q1], i) => {
            const px = x + (i / Math.max(1, history.length - 1)) * width;
            const py = y + height - (q1 / maxQ) * height;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ffaa00';
        this.ctx.lineWidth = 2;
        history.forEach(([, q2], i) => {
            const px = x + (i / Math.max(1, history.length - 1)) * width;
            const py = y + height - (q2 / maxQ) * height;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();

        if (nash) {
            this.ctx.strokeStyle = '#8844ff';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([4, 4]);
            const q1y = y + height - (nash.q1 / maxQ) * height;
            const q2y = y + height - (nash.q2 / maxQ) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(x, q1y);
            this.ctx.lineTo(x + width, q1y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, q2y);
            this.ctx.lineTo(x + width, q2y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    drawPriceChart(x, y, width, height, priceHistory, nash) {
        if (priceHistory.length < 2) return;
        const maxP = Math.max(...priceHistory, nash?.price || 0) * 1.1;

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ff4466';
        this.ctx.lineWidth = 2;
        priceHistory.forEach((price, i) => {
            const px = x + (i / Math.max(1, priceHistory.length - 1)) * width;
            const py = y + height - (price / maxP) * height;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();

        if (nash) {
            this.ctx.strokeStyle = '#8844ff';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([4, 4]);
            const py = y + height - (nash.price / maxP) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(x, py);
            this.ctx.lineTo(x + width, py);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    drawScoreChart(x, y, width, height, players) {
        const maxScore = Math.max(...players.map(p => p.score), 1);

        players.forEach((player, idx) => {
            const color = idx === 0 ? '#00d4aa' : '#ffaa00';
            this.ctx.fillStyle = color;
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${player.strategy}: ${player.score}`, x + idx * (width/2), y - 5);
        });
    }

    drawStrategyBars(x, y, width, height, mix1, mix2, n) {
        const barWidth = width / n / 3;

        mix1.forEach((prob, i) => {
            const bx = x + i * (width / n) + (width / n - barWidth * 2) / 2;
            const bh = prob * height;
            this.ctx.fillStyle = '#00d4aa';
            this.ctx.fillRect(bx, y + height - bh, barWidth, bh);
        });

        mix2.forEach((prob, i) => {
            const bx = x + i * (width / n) + (width / n - barWidth * 2) / 2 + barWidth;
            const bh = prob * height;
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillRect(bx, y + height - bh, barWidth, bh);
        });

        this.ctx.strokeStyle = '#3a3a5a';
        this.ctx.strokeRect(x, y, width, height);
    }

    drawBestResponseChart(x, y, width, height, br1, br2, n) {
        if (!br1.length || !br2.length) return;
        const maxBR = Math.max(...br1, ...br2, 1);
        const barHeight = height / n;

        br1.forEach((val, i) => {
            const bw = (val / maxBR) * width * 0.8;
            this.ctx.fillStyle = '#00d4aa88';
            this.ctx.fillRect(x, y + i * barHeight, bw, barHeight * 0.8);
            if (val === Math.max(...br1)) {
                this.ctx.fillStyle = '#00d4aa';
                this.ctx.fillRect(x + bw, y + i * barHeight, 4, barHeight * 0.8);
            }
        });

        br2.forEach((val, i) => {
            const bw = (val / maxBR) * width * 0.8;
            this.ctx.fillStyle = '#ffaa0088';
            this.ctx.fillRect(x + width * 0.5, y + i * barHeight, bw, barHeight * 0.8);
            if (val === Math.max(...br2)) {
                this.ctx.fillStyle = '#ffaa00';
                this.ctx.fillRect(x + width * 0.5 + bw, y + i * barHeight, 4, barHeight * 0.8);
            }
        });
    }

    drawLegend(legendData) {
        const container = document.getElementById('legend');
        if (!container) return;
        container.innerHTML = legendData.map(item => `
            <span class="legend-item">
                <span class="legend-color" style="background:${item.color}"></span>
                ${item.label}
            </span>
        `).join('');
    }
}