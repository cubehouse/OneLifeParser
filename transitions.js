const fs = require("fs");
const util = require('util');
const sscanf = require("sscanf");
const config = require("./config");
const dir = config.dir;

const readFile = util.promisify(fs.readFile);
const fileExists = util.promisify(fs.exists);
const readDir = util.promisify(fs.readdir);

function ReadTransition(name) {
    return fileExists(`${dir}transitions/${name}.txt`).then(exists => {

        if (!exists) return Promise.resolve(null);

        return readFile(`${dir}transitions/${name}.txt`).then(data => {
            const fileData = data.toString();

            const transition = sscanf(name, "%d_%d", "actor", "target");
            const dataScan = sscanf(
                fileData,
                "%d %d %d %f %f %d %d %d %d",
                "newActor",
                "newTarget",
                "autoDecaySeconds",
                "actorMinUseFraction",
                "targetMinUseFraction",
                "reverseUseActorFlag",
                "reverseUseTargetFlag",
                "move",
                "desiredMoveDist"
            );

            for(let dataKey in dataScan) {
                transition[dataKey] = dataScan[dataKey];
            }

            return Promise.resolve(transition);
        });
    });
}

function ReadAll() {
    return readDir(`${dir}transitions/`).then(files => {
        return new Promise((resolve) => {
            const transitions = [];

            const step = () => {
                const file = files.shift();
                if (!file) {
                    return resolve(transitions);
                }

                ReadTransition(file.slice(0, -4)).then((transition) => {
                    if (transition !== null)
                    {
                        transitions.push(transition);
                    }

                    process.nextTick(step);
                });
            };

            process.nextTick(step);
        });
    });
}

module.exports = {
    read: ReadTransition,
    all: ReadAll,
};
