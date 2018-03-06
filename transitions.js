const fs = require("fs");
const util = require('util');
const sscanf = require("sscanf");
const config = require("./config");
const dir = config.dir;

const readFile = util.promisify(fs.readFile);
const fileExists = util.promisify(fs.exists);
const readDir = util.promisify(fs.readdir);

const Categories = require("./categories");

let cachedCategories = null;
let cachedCategoriesKeys = {};
function GetCategories() {
    if (cachedCategories !== null) return Promise.resolve(cachedCategories);

    return Categories.all().then(cats => {
        cachedCategories = cats;

        for(let key in cats) {
            cachedCategoriesKeys[key] = true;
        }

        return Promise.resolve(cats);
    });
}

function ReadTransition(name) {
    return GetCategories().then((categories) => {

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

                let transitions = [transition];

                // check for expanded transitions (groups/categories of items)
                for(let i=0; i<transitions.length; i++)
                {
                    if (cachedCategoriesKeys[transitions[i].actor])
                    {
                        const newTransitions = [];
                        for(let j=0; j<categories[transitions[i].actor].numObjects; j++)
                        {
                            const newTransition = JSON.parse(JSON.stringify(transitions[i]));
                            // if new actor is also the same category, update it to the same as our input actor
                            if (newTransition.newActor == newTransition.actor) {
                                newTransition.newActor = categories[transitions[i].actor].objects[j];
                            }
                            newTransition.actor = categories[transitions[i].actor].objects[j];

                            newTransitions.push(newTransition);
                        }

                        // overwrite transition with new transitions
                        transitions.splice(i, 1, ...newTransitions);
                    }

                    if (cachedCategoriesKeys[transitions[i].target])
                    {
                        const newTransitions = [];
                        for(let j=0; j<categories[transitions[i].target].numObjects; j++)
                        {
                            const newTransition = JSON.parse(JSON.stringify(transitions[i]));
                            // if new target is also the same category, update it to the same as our input actor
                            if (newTransition.newTarget == transitions[i].target) {
                                newTransition.newTarget = categories[transitions[i].target].objects[j];
                            }
                            newTransition.target = categories[transitions[i].target].objects[j];

                            newTransitions.push(newTransition);
                        }
                        
                        // overwrite transition with new transitions
                        transitions.splice(i, 1, ...newTransitions);
                    }
                }

                return Promise.resolve(transitions);
            });
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
                        for(let i=0; i<transition.length; i++) transitions.push(transition[i]);
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

// ???!
//ReadTransition("209_-1").then(console.log);