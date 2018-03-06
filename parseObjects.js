const fs = require("fs");
const util = require('util');
const sscanf = require("sscanf");

const dir = `${__dirname}/../OneLifeData/`;

const readFile = util.promisify(fs.readFile);
const fileExists = util.promisify(fs.exists);

function ParseSoundString(sound) {
    return sound.split("#").map(x=> {
        const soundData = sscanf(x, "%d:%f", "id", "volume");
        if (soundData.id == -1) return null;
        return soundData;
    }).filter(x=>x!==null);
}

function ReadObjectFile(id) {
    return fileExists(`${dir}objects/${id}.txt`).then(exists => {
        if (!exists) return Promise.resolve(null);
        return readFile(`${dir}objects/${id}.txt`).then(data => {
            const fileData = data.toString();

            const lines = fileData.split("\r\n");

            // we will populate this with parsed data
            //  define the defaults here
            // called r for consistency with objectBank.cpp
            const r = {
                id: 0,
                containable: 0,
                containSize: 1,
                vertContainRotationOffset: 0,
                minPickupAge: 3,
                permanent: 0,
                heldInHand: false,
                rideable: false,
                leftBlockingRadius: 0,
                rightBlockingRadius: 0,
                blocksWalking: 0,
                drawBehindPlayer: 0,
                wide: 0,
                mapChance: 0,
                biomes: [],
                heatValue: 0,
                rValue: 0,
                person: false,
                race: 0,
                personNoSpawn: 0,
                male: 0,
                deathMarker: 0,
                homeMarker: false,
                floor: false,
                floorHugging: 0,
                heldOffset: {
                    x: 0,
                    y: 0
                },
                clothing: 'n',
                clothingOffset: {
                    x: 0,
                    y: 0
                },
                deadlyDistance: 0,
                useDistance: 1,
                creationSound: "",
                usingSound: "",
                eatingSound: "",
                decaySound: "",
                creationSoundInitialOnly: 0,
                numSlots: 0,
                slotTimeStretch: 1,
                slotSize: 1,
                slots: [],
                numSprites: 0,
                sprites: [],
                numUses: 1,
                cachedHeight: -1,
                spriteSkipDrawing: [],
            };

            // inline function to step over lines
            let lineIdx = 0;
            const nextLine = () => {
                if (lineIdx >= lines.length) return null;
                return lines[lineIdx++];
            };

            // inline parser function so we can inject into obj
            const parseLine = function(format) {
                if (format === null || format == "") return;

                // fix up inputs for specific datatypes we don't care about because types are for real programmers!
                format = format.replace(/%l/g, "%"); // remove %l*, as the sscanf lib doesn't like it (just remove, it'll boil down to the correct number type for JS)
                format = format.replace(/%[0-9]+s/g, "%s"); // remove %[0-9]+s, as lib doesn't seem to pick it up correctly

                // get next line to parse
                const line = nextLine();
                if (line === null) return;

                // call sscanf
                const args = [line, ...arguments];
                const scanResponse = sscanf(...args);

                // check if we get any responses to test for missing lines (old file formats)
                let nonNullResponses = 0;

                // inject response into our obj variable
                for(let key in scanResponse)
                {
                    // count how many properties we generally got
                    if (scanResponse[key] !== null) {
                        nonNullResponses++;
                    }

                    let objKey, type;
                    [objKey, type] = key.split("|");
                    // don't inject any invalid entries
                    if (scanResponse[key] !== null && !Number.isNaN(scanResponse[key]))
                    {
                        let value = scanResponse[key];
                        if (type == "b")
                        {
                            value = (scanResponse[key] == 1);
                        }

                        // support nested objects (to a degree) - I'm sure there is a smarter way of doing this
                        const keys = objKey.split(".");
                        if (keys.length == 1)
                        {
                            r[objKey] = value;
                        }
                        else if (keys.length == 2)
                        {
                            r[keys[0]][keys[1]] = value;
                        }
                        else if (keys.length == 3)
                        {
                            if (!r[keys[0]][keys[1]]) r[keys[0]][keys[1]] = {};
                            r[keys[0]][keys[1]][keys[2]] = value;
                        }
                        else if (keys.length == 4)
                        {
                            if (!r[keys[0]][keys[1]]) r[keys[0]][keys[1]] = {};
                            if (!r[keys[0]][keys[1]][keys[2]]) r[keys[0]][keys[1]][keys[2]] = {};
                            r[keys[0]][keys[1]][keys[2]][keys[3]] = value;
                        }
                    }
                }

                // reparse this line if we didn't match (the line was missing from the object file, suggesting an old format)
                if (nonNullResponses == 0)
                {
                    lineIdx--;
                }
            }

            // take the line key, remove the key (and = symbol), then split
            const lineToBoolArray = (key, objKey, size) => {
                nextLine().substring(key.length + 1).split(",").map(x => Number(x)).map(x => {
                    if (x >= 0 && x < size) r.sprites[x][objKey] = true;
                });
            };
            
            // this is generally copy/pasted from objectBank.cpp::initObjectBankStep
            //  the game itself has one hell of a manual parser, so I've had to duplicate it here
            // pass in the format string as the first argument to parseLine
            //  all following arguments are the names of the variables
            //  optionally use | to add a type (for booleans expressed as 0/1)
            parseLine("id=%d", "id");
            r.description = nextLine();
            parseLine("containable=%d", "containable");
            parseLine("containSize=%d,vertSlotRot=%lf", "containSize", "vertContainRotationOffset");
            parseLine("permanent=%d,minPickupAge=%d", "permanent", "minPickupAge");
            parseLine("heldInHand=%d", "heldInHand|b");
            r.rideable = (r.heldInHand == 2);
            parseLine("blocksWalking=%d,leftBlockingRadius=%d,rightBlockingRadius=%d,drawBehindPlayer=%d", "blocksWalking", "leftBlockingRadius", "rightBlockingRadius", "drawBehindPlayer");
            r.wide = (r.leftBlockingRadius > 0 || r.rightBlockingRadius > 0);
            if (r.wide){
                r.drawBehindPlayer = true;
            }
            parseLine("mapChance=%f#biomes_%199s", "mapChance", "_biomeString");
            if (!r._biomeString) {
                r.mapChance = 0;
            } else {
                r.biomes = r._biomeString.split(",").map(x => Number(x));
                delete r._biomeString;
            }
            parseLine("heatValue=%d", "heatValue");
            parseLine("rValue=%f", "rValue");
            parseLine("person=%d,noSpawn=%d", "race", "personNoSpawn");
            r.person = (r.race > 0);
            parseLine("male=%d", "male");
            parseLine("deathMarker=%d", "deathMarkerRead");
            parseLine("homeMarker=%d", "homeMarker");
            parseLine("floor=%d", "floor");
            parseLine("floorHugging=%d", "floorHugging");
            parseLine("foodValue=%d", "foodValue");
            parseLine("speedMult=%f", "speedMult");
            parseLine("heldOffset=%lf,%lf", "heldOffset.x", "heldOffset.y");
            parseLine("clothing=%c", "clothing");
            parseLine("clothingOffset=%lf,%lf", "clothingOffset.x", "clothingOffset.y");
            parseLine("deadlyDistance=%d", "deadlyDistance");
            parseLine("useDistance=%d", "useDistance");
            const sounds = nextLine().substring(7).split(",");
            if (sounds.length == 4) {
                [r.creationSound, r.usingSound, r.eatingSound, r.decaySound] = sounds.map(ParseSoundString);
            }
            parseLine("creationSoundInitialOnly=%d", "creationSoundInitialOnly");
            parseLine("numSlots=%d#timeStretch=%f", "numSlots", "slotTimeStretch");
            parseLine("slotSize=%d", "slotSize");
            for(let slotIdx=0; slotIdx < r.numSlots; slotIdx++) {
                parseLine("slotPos=%lf,%lf,vert=%d,parent=%d", `slots.${slotIdx}.pos.x`, `slots.${slotIdx}.pos.y`, `slots.${slotIdx}.vert`, `slots.${slotIdx}.parent`);
            }
            parseLine("numSprites=%d", "numSprites");
            for(let spriteIdx=0; spriteIdx < r.numSprites; spriteIdx++) {
                parseLine("spriteID=%d", `sprites.${spriteIdx}.id`);
                parseLine("pos=%lf,%lf", `sprites.${spriteIdx}.pos.x`, `sprites.${spriteIdx}.pos.y`);
                parseLine("rot=%lf", `sprites.${spriteIdx}.rot`);
                parseLine("hFlip=%d", `sprites.${spriteIdx}.hFlip`);
                parseLine("color=%f,%f,%f", `sprites.${spriteIdx}.color.r`, `sprites.${spriteIdx}.color.g`, `sprites.${spriteIdx}.color.b`);
                parseLine("ageRange=%lf,%lf", `sprites.${spriteIdx}.ageStart`, `sprites.${spriteIdx}.ageEnd`);
                parseLine("parent=%d", `sprites.${spriteIdx}.parent`);
                parseLine(
                    "invisHolding=%d,invisWorn=%d,behindSlots=%d",
                    `sprites.${spriteIdx}.invisibleWhenHolding`,
                    `sprites.${spriteIdx}.invisibleWhenWorn`,
                    `sprites.${spriteIdx}.behindSlots`
                );
            }
            lineToBoolArray("headIndex", "isHead", r.numSprites);
            lineToBoolArray("bodyIndex", "isBody", r.numSprites);
            lineToBoolArray("backFootIndex", "isBackFoot", r.numSprites);
            lineToBoolArray("frontFootIndex", "isFrontFoot", r.numSprites);
            parseLine("numUses=%d", "numUses");
            lineToBoolArray("useVanishIndex", "useVanish", r.numSprites);
            lineToBoolArray("useAppearIndex", "useAppear", r.numSprites);
            parseLine("pixHeight=%d", "cachedHeight");

            return Promise.resolve(r);
        });
    });
}

for(var i=1; i<670; i++) {
    ReadObjectFile(i);
}

ReadObjectFile(354).then(r=> {
    //console.log(JSON.stringify(r, null, 2));
});

//ParseSoundString("870:0.250000").then(console.log);
//ParseSoundString("898:0.008333#899:0.008333#900:0.016667#901:0.008333").then(console.log);

//console.log(sscanf("mapChance=1.000000#biomes_0,3", "mapChance=%f#biomes_%s", "mapChance", "_biomeString"));