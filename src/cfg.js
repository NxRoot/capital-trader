const { configPath, conf } = require('./utils/constant');
const config = conf();
delete config.strategyCode;
console.log("")
console.log(config)
console.log("")
console.log(`Config File: ${configPath}`)
console.log("")