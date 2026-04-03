#!/usr/bin/env node
const arg = process.argv[2];

// Start the bot
if(!arg) {
  require('./bot');
}

// Show help
else if (arg === '--help') {
  require('./help');
}

// Open config
else if (arg === '--config') {
  require('./cfg');
}

// Set variables
else if (arg === '--set') {
  require('./set');
}

// Show strategy
else if (arg === '--code') {
  require('./strat');
}

// Clear strategy
else if (arg === '--clear') {
  require('./clear');
}

// Test the bot
else if (arg === '--test') {
  require('./test');
}

// AI assistant
else if (process.argv?.slice(2)?.join(" ")?.split(" ")?.length > 2) {
  require('./ai');
}

// Show help
else{
  require('./help');
}