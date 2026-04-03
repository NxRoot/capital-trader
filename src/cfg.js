const { configPath, conf } = require('./utils/constant');
const config = conf(true);
delete config.strategyCode;
console.log("")
console.log(`Config File: ${configPath}`)
console.log("")
console.log(config)
console.log("")
