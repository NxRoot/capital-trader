#!/usr/bin/env node
const arg = process.argv[2];
const txt = process.argv?.slice(2)?.join(" ")

const commands = {
  "--help"   :  './help',
  "--config" :  './cfg',
  "--set"    :  './set',
  "--code"   :  './strat',
  "--clear"  :  './clear',
  "--test"   :  './test',
}

if(!arg) {
  require('./bot');
}

else if(commands[arg]) {
  require(commands[arg]);
}

else if (txt?.split(" ")?.length > 1) {
  require('./ai');
}

else {
  require('./help');
}