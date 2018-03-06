const fs = require("fs");
const util = require('util');
const sscanf = require("sscanf");
const config = require("./config");
const dir = config.dir;

const readFile = util.promisify(fs.readFile);
const fileExists = util.promisify(fs.exists);
const readDir = util.promisify(fs.readdir);


function ReadCategory(catID) {
    return fileExists(`${dir}categories/${catID}.txt`).then(exists => {

        if (!exists) return Promise.resolve(null);

        return readFile(`${dir}categories/${catID}.txt`).then(data => {
            const lines = data.toString().replace(/\r\n/g, "\n").split("\n");
            
            let next = 0;

            const category = {
                objects: [],
            };

            category.parentID = sscanf(lines[next++], "parentID=%d");
            category.numObjects = sscanf(lines[next++], "numObjects=%d");

            for(let objIdx = 0; objIdx < category.numObjects; objIdx++) {
                category.objects.push(Number(lines[next++]));
            }

            return Promise.resolve(category);
        });
    });
}

function ReadAll() {
    return readDir(`${dir}categories/`).then(files => {
        return new Promise((resolve) => {
            const categories = {};

            const step = () => {
                const file = files.shift();
                if (!file) {
                    return resolve(categories);
                }

                ReadCategory(file.slice(0, -4)).then((category) => {
                    if (category !== null)
                    {
                        categories[category.parentID] = category;
                    }

                    process.nextTick(step);
                });
            };

            process.nextTick(step);
        });
    });
}

module.exports = {
    read: ReadCategory,
    all: ReadAll,
};
