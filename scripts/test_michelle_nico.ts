import fs from 'fs';
import * as THREE from 'three';

const nicoBuf = fs.readFileSync('./public/models/nico.glb');
const nicoJson = JSON.parse(nicoBuf.subarray(20, 20 + nicoBuf.readUInt32LE(12)).toString('utf8'));

const michelleBuf = fs.readFileSync('./public/models/michelle.glb');
const michelleJson = JSON.parse(michelleBuf.subarray(20, 20 + michelleBuf.readUInt32LE(12)).toString('utf8'));

// Compare node names
const nicoNodeNames = new Set(nicoJson.nodes.map((n: any) => n.name));
const michelleNodeNames = new Set(michelleJson.nodes.map((n: any) => n.name));

let matchingChannels = 0;
let totalChannels = 0;

nicoJson.animations.forEach((anim: any) => {
  anim.channels.forEach((ch: any) => {
    totalChannels++;
    const targetNode = nicoJson.nodes[ch.target.node];
    if (targetNode && michelleNodeNames.has(targetNode.name)) {
      matchingChannels++;
    }
  });
});

console.log(`Matching channels: ${matchingChannels} / ${totalChannels} (${((matchingChannels/totalChannels)*100).toFixed(1)}%)`);
