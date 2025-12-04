let pendingEdits = [];

function log(message) {
  const logDiv = document.getElementById('log');
  logDiv.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '<br>';
  logDiv.scrollTop = logDiv.scrollHeight;
}

function createOfflineEdit(userType, docId) {
  const dosageInput = document.getElementById(userType + 'Dosage');
  const dosage = parseInt(dosageInput.value);
  
  const edit = {
    docId: docId,
    value: { dosage: dosage },
    userId: 'user_' + userType
  };
  
  pendingEdits.push(edit);
  log(userType.toUpperCase() + ' created offline edit: dosage=' + dosage + 'mg');
  
  // Visual feedback
  dosageInput.style.border = '2px solid green';
  setTimeout(() => dosageInput.style.border = '', 1000);
}

async function syncAll() {
  if (pendingEdits.length === 0) {
    log('No pending edits');
    return;
  }
  
  log('Starting sync with ' + pendingEdits.length + ' pending edits...');
  
  try {
    const response = await fetch('http://localhost:3000/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claims: pendingEdits })
    });
    
    const result = await response.json();
    log('Sync completed. Server decisions:');
    
    Object.entries(result.decisions).forEach(([docId, decision]) => {
      if (decision.status === 'accepted') {
        log('  ' + docId + ': ACCEPTED dosage=' + decision.value.dosage + 'mg');
      } else {
        log('  ' + docId + ': REJECTED (' + decision.reason + ')');
      }
    });
    
    pendingEdits = [];
  } catch (error) {
    log('Sync failed: ' + error.message + ' (Make sure server is running)');
  }
}

// Test button for quick demo
window.onload = function() {
  log('Demo ready. Create offline edits from Doctor and Hacker, then click Force Sync.');
};