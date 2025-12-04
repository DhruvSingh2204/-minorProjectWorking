class TrustWMVSimulation {
  betaTrust(alpha, beta) {
    return (alpha + 1) / (alpha + beta + 2);
  }

  wmvWeight(p) {
    return Math.log(p / (1 - p));
  }

  runMaliciousRejectionSimulation(cycles = 5000) {
    let rejectedCount = 0, totalCycles = 0;

    for (let i = 0; i < cycles; i++) {
      const conflictSize = 1 + Math.floor(Math.random() * 5);
      const sources = Array(conflictSize).fill(0).map(() => ({
        alpha: 1, beta: 1,
        isBenign: Math.random() < 0.8,
      }));

      // Weighted votes tallied
      const votes = { good: 0, bad: 0 };
      sources.forEach((source) => {
        const p = source.isBenign ? 0.95 : 0.2;
        const vote = Math.random() < p;
        const trust = this.betaTrust(source.alpha, source.beta);
        votes[vote ? 'good' : 'bad'] += this.wmvWeight(trust);
      });

      const maxVoteWeight = Math.max(votes.good, votes.bad);
      if (maxVoteWeight < 0.6) {
        rejectedCount++;
      }
      totalCycles++;
    }

    return ((rejectedCount / totalCycles) * 100).toFixed(2) + '%';
  }

  simulateTrustEvolution() {
    const good = { alpha: 1, beta: 1 };
    const bad = { alpha: 1, beta: 1 };

    console.log('Step\tGood Trust\tMalicious Trust');
    for (let step = 0; step <= 50; step += 10) {
      for (let j = 0; j < 10; j++) {
        good[Math.random() < 0.95 ? 'alpha' : 'beta']++;
        const badBehaviorProb = step > 20 ? 0.2 : 0.95;
        bad[Math.random() < badBehaviorProb ? 'alpha' : 'beta']++;
      }
      console.log(
        step + '\t' + this.betaTrust(good.alpha, good.beta).toFixed(3) + '\t' + this.betaTrust(bad.alpha, bad.beta).toFixed(3)
      );
    }
  }
}

const simulation = new TrustWMVSimulation();
console.log('Malicious update rejection rate:', simulation.runMaliciousRejectionSimulation());
console.log('\nTrust Score Evolution:');
simulation.simulateTrustEvolution();