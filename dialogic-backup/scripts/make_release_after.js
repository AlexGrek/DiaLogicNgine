const path = require('path');
const fs = require('fs');
const directoryPath = path.join(__dirname, '../src');

const appfile = path.join(directoryPath, "index.tsx")
const runtimefile = path.join(directoryPath, "index_game.tsx")
const backupname = path.join(directoryPath, "index_bak.tsx")

console.log("Renaming file " + backupname)

fs.renameSync(appfile, runtimefile)
fs.renameSync(backupname, appfile)