function finite(...values){if(!values.every(Number.isFinite))throw new RangeError('quantum parameters must be finite');}
export function jointProbabilities(chi,phi,alpha,beta){
  finite(chi,phi,alpha,beta);if(chi<0||chi>Math.PI/4+1e-12)throw new RangeError('chi must be between zero and pi/4');
  const local=Math.cos(2*chi),correlation=Math.cos(alpha)*Math.cos(beta)+Math.sin(2*chi)*Math.cos(phi)*Math.sin(alpha)*Math.sin(beta);
  return [[1,1],[1,-1],[-1,1],[-1,-1]].map(([a,b])=>Math.max(0,Math.min(1,(1+a*local*Math.cos(alpha)+b*local*Math.cos(beta)+a*b*correlation)/4)));
}
export function quantumMetrics(chi){finite(chi);if(chi<0||chi>Math.PI/4+1e-12)throw new RangeError('chi must be between zero and pi/4');const concurrence=Math.sin(2*chi),blochLength=Math.abs(Math.cos(2*chi));return {concurrence,blochLength,purity:(1+blochLength*blochLength)/2};}
export function correlation(chi,phi,alpha,beta){const p=jointProbabilities(chi,phi,alpha,beta);return p[0]-p[1]-p[2]+p[3];}
export function chsh(chi,phi){return Math.abs(correlation(chi,phi,0,Math.PI/4)+correlation(chi,phi,0,-Math.PI/4)+correlation(chi,phi,Math.PI/2,Math.PI/4)-correlation(chi,phi,Math.PI/2,-Math.PI/4));}
export function sampleOutcomes(probabilities,count,random=Math.random){
  if(!Array.isArray(probabilities)||probabilities.length!==4||!probabilities.every(p=>Number.isFinite(p)&&p>=0&&p<=1)||Math.abs(probabilities.reduce((a,b)=>a+b,0)-1)>1e-9||!Number.isInteger(count)||count<0||count>1000000||typeof random!=='function')throw new RangeError('a normalized distribution and bounded sample count are required');
  const counts=[0,0,0,0];for(let i=0;i<count;i++){const sample=random();if(!Number.isFinite(sample)||sample<0||sample>=1)throw new RangeError('random value must be in [0,1)');let cumulative=0;for(let j=0;j<4;j++){cumulative+=probabilities[j];if(sample<cumulative||j===3){counts[j]++;break;}}}return counts;
}
