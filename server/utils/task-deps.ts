/**
 * Task dependency utilities.
 *
 * Pure functions — no database or side-effect dependencies.
 */

export interface TaskNode {
  id: string;
  parentId: string | null;
}

/**
 * Check whether assigning `proposedParentId` to `taskId` would create a cycle.
 *
 * Traverses the parent chain upward from `proposedParentId` via BFS. Returns
 * `true` if `taskId` is found along that chain (cycle detected).
 */
export function detectCycle(
  tasks: TaskNode[],
  taskId: string,
  proposedParentId: string,
): boolean {
  // Build a lookup map: child -> parent
  const parentMap = new Map<string, string | null>();
  for (const t of tasks) {
    parentMap.set(t.id, t.parentId);
  }

  const visited = new Set<string>();
  const queue: string[] = [proposedParentId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const parent = parentMap.get(current);
    if (parent) {
      queue.push(parent);
    }
  }

  return false;
}

/**
 * Convenience alias — same as `detectCycle`, exported for ergonomic import.
 */
export const isCycle = detectCycle;

/**
 * Topological sort using Kahn's algorithm.
 *
 * Returns the sorted task IDs and any cycles that prevent a complete sort.
 * Cycle entries are the strongly-connected component IDs (tasks that form a
 * cycle) — each inner array represents one cycle.
 */
export function topologicalSort(tasks: TaskNode[]): {
  sorted: string[];
  cycles: string[][];
} {
  // Build adjacency: parent -> [children]
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const t of tasks) {
    if (!inDegree.has(t.id)) inDegree.set(t.id, 0);
    if (!children.has(t.id)) children.set(t.id, []);
  }

  for (const t of tasks) {
    if (t.parentId) {
      if (!children.has(t.parentId)) children.set(t.parentId, []);
      children.get(t.parentId)!.push(t.id);
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const child of children.get(current) ?? []) {
      const deg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, deg);
      if (deg === 0) queue.push(child);
    }
  }

  // Detect cycles — remaining nodes with inDegree > 0
  const cycles: string[][] = [];
  const remaining = new Set<string>();
  for (const [id, deg] of inDegree) {
    if (deg > 0) remaining.add(id);
  }

  if (remaining.size > 0) {
    // Group connected cycle nodes via DFS on remaining graph
    const adj = new Map<string, string[]>();
    for (const t of tasks) {
      if (t.parentId && remaining.has(t.id) && remaining.has(t.parentId)) {
        if (!adj.has(t.id)) adj.set(t.id, []);
        adj.get(t.id)!.push(t.parentId);
        if (!adj.has(t.parentId)) adj.set(t.parentId, []);
        adj.get(t.parentId)!.push(t.id);
      }
    }

    const visited = new Set<string>();
    for (const node of remaining) {
      if (visited.has(node)) continue;
      const component: string[] = [];
      const stack = [node];
      while (stack.length > 0) {
        const n = stack.pop()!;
        if (visited.has(n)) continue;
        visited.add(n);
        component.push(n);
        for (const neighbor of adj.get(n) ?? []) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
      cycles.push(component);
    }
  }

  return { sorted, cycles };
}
