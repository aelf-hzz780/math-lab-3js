import {generateAuthorPatch} from '../../vendor/hat/generator.js';
export function generateHatPatch(depth=2){if(!Number.isInteger(depth)||depth<0||depth>3)throw new RangeError('Hat depth must be an integer from 0 to 3');return generateAuthorPatch(depth);}
export function polygonArea(points){if(!Array.isArray(points)||points.length<3||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))throw new RangeError('Invalid polygon');return points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0)/2;}
