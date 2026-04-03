#!/usr/bin/env node
const arg = process.argv[2];

// Start the bot
if(!arg) {
  require('./bot');
}

// Open config
else if (arg === 'config') {
  require('./cfg');
}

// Set variables
else if (arg === 'set') {
  require('./set');
}

// Clear strategy
else if (arg === 'clear') {
  require('./clear');
}

// Test the bot
else if (arg === 'test') {
  require('./test');
}

// AI assistant
else {
  require('./ai');
}