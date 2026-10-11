import fs from 'fs';
import * as THREE from 'three';

// Let's inspect the tracks of 'chicken' from nico.glb vs michelle.glb
const nicoBuf = fs.readFileSync('./public/models/nico.glb');
const nicoJson = JSON.parse(nicoBuf.subarray(20, 20 + nicoBuf.readUInt32LE(12)).toString('utf8'));

const michelleBuf = fs.readFileSync('./public/models/michelle.glb');
const michelleJson = JSON.parse(michelleBuf.subarray(20, 20 + michelleBuf.readUInt32LE(12)).toString('utf8'));

const nicoNodes = nicoJson.nodes.map((n: any) => n.name);
const michelleNodes = michelleJson.nodes.map((n: any) => n.name);

console.log('Total Nico nodes:', nicoNodes.length);
console.log('Total Michelle nodes:', michelleNodes.length);

// Let's check why sharedClips might fail on Michelle
const sharedAnimationNames = nicoJson.animations.map((a: any) => a.name);
console.log('Nico animations:', sharedAnimationNames);
