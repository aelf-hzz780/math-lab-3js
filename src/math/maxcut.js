export function validateGraph(graph){
 if(!graph||!Number.isInteger(graph.vertices)||graph.vertices<1||graph.vertices>1000||!Array.isArray(graph.edges))throw new RangeError('Invalid graph');
 const pairs=new Set();let total=0;
 for(const edge of graph.edges){if(edge?.length!==3)throw new RangeError('Invalid edge');const[a,b,w]=edge;if(![a,b,w].every(Number.isSafeInteger)||a<1||b>graph.vertices||a>=b||w<=0||pairs.has(`${a},${b}`))throw new RangeError('Invalid edge');pairs.add(`${a},${b}`);total+=w;}
 if(!Number.isSafeInteger(total))throw new RangeError('Weight sum exceeds safe integer');return total;
}
function validateColors(graph,colors){if(colors?.length!==graph.vertices||!colors.every(c=>Number.isInteger(c)&&c>=0&&c<4))throw new RangeError('Coloring must assign one of 4 colors to every vertex');}
export function cutWeight(graph,colors){validateGraph(graph);validateColors(graph,colors);return graph.edges.reduce((sum,[a,b,w])=>sum+(colors[a-1]!==colors[b-1]?w:0),0);}
export function improveColoring(graph,colors){
 validateGraph(graph);validateColors(graph,colors);const output=colors.slice();let bestGain=0,bestVertex=-1,bestColor=0;
 for(let vertex=0;vertex<graph.vertices;vertex++){
  const weights=[0,0,0,0];for(const[a,b,w]of graph.edges){if(a-1===vertex)weights[output[b-1]]+=w;else if(b-1===vertex)weights[output[a-1]]+=w;}
  for(let color=0;color<4;color++){const gain=weights[output[vertex]]-weights[color];if(gain>bestGain){bestGain=gain;bestVertex=vertex;bestColor=color;}}
 }
 if(bestVertex>=0)output[bestVertex]=bestColor;return output;
}
