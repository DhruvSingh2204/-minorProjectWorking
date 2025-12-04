const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Set initial trust so doctor starts higher than hacker for demo
const trustStore = {
  user_doctor: { alpha: 5, beta: 1 }, // trust ~0.75
  user_hacker: { alpha: 1, beta: 5 }   // trust ~0.25
};

function betaTrust(alpha, beta) {
  return (alpha + 1) / (alpha + beta + 2);
}

function wmvWeight(p) {
  if (p === 0 || p === 1) return 0;
  return Math.log(p / (1 - p));
}

app.post('/sync', (req, res) => {
  const { claims } = req.body;

  console.log('\nProcessing sync claims:', claims.length);

  const grouped = {};
  claims.forEach(claim => {
    if (!grouped[claim.docId]) grouped[claim.docId] = [];
    grouped[claim.docId].push(claim);
  });

  const decisions = {};

  Object.entries(grouped).forEach(([docId, claimSet]) => {
    console.log('\nDocument conflict:', docId, claimSet.length, 'claims');

    const uniqueValues = [...new Set(claimSet.map(c => JSON.stringify(c.value)))];
    if (uniqueValues.length === 1) {
      decisions[docId] = { status: 'accepted', value: claimSet[0].value, reason: 'unanimous' };
      console.log('  Unanimous agreement');
      return;
    }

    const votes = {};
    claimSet.forEach(claim => {
      const tr = trustStore[claim.userId] || { alpha: 0, beta: 0 };
      const trust = betaTrust(tr.alpha, tr.beta);
      const weight = wmvWeight(trust);

      console.log(claim.userId + ': trust=' + trust.toFixed(2) + ', weight=' + weight.toFixed(2) + ', value=' + JSON.stringify(claim.value));

      const valStr = JSON.stringify(claim.value);
      if (!votes[valStr]) votes[valStr] = { totalWeight: 0, users: [] };
      votes[valStr].totalWeight += weight;
      votes[valStr].users.push(claim.userId);
    });

    const winnerEntry = Object.entries(votes).reduce((a, b) =>
      a[1].totalWeight > b[1].totalWeight ? a : b
    );

    const winnerValue = JSON.parse(winnerEntry[0]);
    const winnerWeight = winnerEntry[1].totalWeight;

    console.log('  Winner:', JSON.stringify(winnerValue), 'weight:', winnerWeight.toFixed(2));

    if (winnerWeight >= 0.6) {
      decisions[docId] = { status: 'accepted', value: winnerValue };
      claimSet.forEach(claim => {
        if (!trustStore[claim.userId]) trustStore[claim.userId] = { alpha: 0, beta: 0 };
        if (JSON.stringify(claim.value) === winnerEntry[0]) {
          trustStore[claim.userId].alpha++;
        } else {
          trustStore[claim.userId].beta++;
        }
      });
      console.log('  Accepted');
    } else {
      decisions[docId] = { status: 'rejected', reason: 'trust weight too low' };
      claimSet.forEach(claim => {
        if (!trustStore[claim.userId]) trustStore[claim.userId] = { alpha: 0, beta: 0 };
        trustStore[claim.userId].beta++;
      });
      console.log('  Rejected');
    }
  });

  console.log('\nCurrent trust scores:');
  Object.entries(trustStore).forEach(([user, tr]) => {
    const trustVal = betaTrust(tr.alpha, tr.beta);
    console.log(`  ${user}: alpha=${tr.alpha}, beta=${tr.beta}, trust=${trustVal.toFixed(2)}`);
  });

  res.json({ decisions, trustStore });
});

app.get('/trust', (req, res) => {
  res.json(trustStore);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});