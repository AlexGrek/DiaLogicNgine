
const path = require('path');
const fs = require('fs');
const directoryPath = path.join(__dirname, '../public/game_assets');

LIST = "list.json"

// Recursive function to get files
function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = `${dir}/${file}`;
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else {
            if (!file.endsWith(LIST))
                files.push(path.relative(directoryPath, name).replace(/\\/g, '/'));
        }
    }
    return files;
}

files = getFiles(directoryPath)
console.log(files)

let data = JSON.stringify(files);
fs.writeFileSync(path.join(directoryPath, 'list.json'), data);
