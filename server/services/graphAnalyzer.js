class GraphAnalyzer {
  constructor(events) {
    this.events = events;
    this.adjList = new Map();
  }

  buildGraph() {
    for (const event of this.events) {
      const { from, to } = event;
      if (!this.adjList.has(from)) this.adjList.set(from, []);
      if (!this.adjList.has(to)) this.adjList.set(to, []);
      this.adjList.get(from).push(to);
    }
  }

  detectOrphans() {
    const hasIncoming = new Set();
    for (const [node, edges] of this.adjList.entries()) {
      for (const edge of edges) {
        hasIncoming.add(edge);
      }
    }
    const orphans = [];
    for (const node of this.adjList.keys()) {
      if (!hasIncoming.has(node)) orphans.push(node);
    }
    return orphans;
  }

  computeAnomalyScore() {
    this.buildGraph();
    const orphans = this.detectOrphans();
    
    let score = 0;
    if (orphans.length > 1) score += 0.3;
    
    return Math.min(1, score);
  }
}

module.exports = { GraphAnalyzer };
