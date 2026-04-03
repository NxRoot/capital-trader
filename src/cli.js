#!/usr/bin/env node
const arg = process.argv[2];
const txt = process.argv?.slice(2)?.join(" ")

const commands = {
  "--help":   () => require('./help'),
  "--config": () => require('./cfg'),
  "--set":    () => require('./set'),
  "--code":   () => require('./strat'),
  "--clear":  () => require('./clear'),
  "--test":   () => require('./test'),
}

if(!arg) {
  require('./bot');
}

else if(commands[arg]) {
  commands[arg]();
}

else if (txt?.split(" ")?.length > 1) {
  require('./ai');
}

else {
  require('./help');
}