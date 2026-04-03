const { writeFileSync } = require('fs')
const { configPath, conf } = require('./utils/constant')

const config = conf()
config["strategyCode"] = "type = 'BUY'; canOpen = false; canClose = false;"

writeFileSync(configPath, JSON.stringify(config, null, 2))
console.log(`\nStrategy code set to default`)
