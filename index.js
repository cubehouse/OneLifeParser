const Objects = require("./objects");
const Transitions = require("./transitions");

const fs = require("fs");
const util = require('util');

const readFile = util.promisify(fs.readFile);

const config = require("./config");
const dir = config.dir;

Objects.all().then(allObjects => {
    const OName = (objID) => {
        if (objID == -1) return "*drop*";
        if (objID < 0) return `*ACTION::${objID}*`;
        if (allObjects[objID] === null || allObjects[objID] === undefined) return "*nothing*";
        return allObjects[objID].description;
    };

    Transitions.all().then(allTransitions => {
        for(let i=0, t; t=allTransitions[i++];)
        {
            console.log(`${OName(t.actor)} (held) + ${OName(t.target)} (ground) = ${OName(t.newActor)} (held) + ${OName(t.newTarget)} (ground)`);
        }

        console.log(` # Found ${allTransitions.length} transitions`);
    });
});

