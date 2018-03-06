const Objects = require("./objects");
const Transitions = require("./transitions");

const fs = require("fs");
const util = require('util');

const readFile = util.promisify(fs.readFile);

const config = require("./config");
const dir = config.dir;

Objects.all().then(allObjects => {
    const OName = (objID) => {
        if (allObjects[objID] === null || allObjects[objID] === undefined) return `nothing(${objID})`;
        return `${allObjects[objID].description}(${objID})`;
    };

    Transitions.all().then(allTransitions => {
        for(let i=0, t; t=allTransitions[i++];)
        {
            if (t.target != -1) continue;
            if (t.actor < 0)
            {
                console.log(`${OName(t.target)} after ${t.autoDecaySeconds} seconds${GameTime(t.autoDecaySeconds)} = ${OName(t.newTarget)}`);
            }
            else
            {
                console.log(`${OName(t.actor)} + ${OName(t.target)} = ${OName(t.newActor)} + ${OName(t.newTarget)}`);
            }
        }

        console.log(` # Found ${allTransitions.length} transitions`);
    });
});

function GameTime(seconds) {
    if (seconds < 60) {
        return "";
    }
    const years = seconds/60;
    if (years < 60) return ` (${years} years)`;
    const remainer = (years % 60).toFixed(0);
    const lifetimes = Math.floor(years / 60);
    if (remainer == 0)
    {
        return ` (${lifetimes} lifetimes)`;
    }
    else
    {
        return ` (${lifetimes} lifetimes, ${remainer} years)`;
    }
}