
const path = require('path');
const fs = require('fs');
const assets = path.join(__dirname, '../public/game_assets');
const games = path.join(__dirname, '../public/games');

LIST = "list.json"

// Recursive function to get files
function getFiles(root, dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = `${dir}/${file}`;
        if (fs.statSync(name).isDirectory()) {
            getFiles(root, name, files);
        } else {
            if (!file.endsWith(LIST))
                files.push(path.relative(root, name).replace(/\\/g, '/'));
        }
    }
    return files;
}

function dumpFileList(root, destination, filename) {
    let files = getFiles(root, root)
    let data = JSON.stringify(files)
    fs.writeFileSync(path.join(destination, filename), data)
}


dumpFileList(assets, assets, 'list.json')
dumpFileList(games, games, 'list.json')