import type { ExecutionFrame, RecursionNode } from "@dp-explorer/playback";

import "./recursion-tree.css";

export interface RecursionTreeViewProps {
  readonly frame: ExecutionFrame;
}

/**
 * Nested React renderer for the top-down recursion tree snapshot.
 *
 * The component consumes only `ExecutionFrame`; it never reads the trace or
 * derives algorithm state outside the recursion tree already present there.
 */
export function RecursionTreeView({ frame }: RecursionTreeViewProps) {
  const tree = frame.recursionTree;

  if (tree === null) {
    return null;
  }

  const activeBranch = activeBranchFor(frame);
  const childrenByParent = childrenByParentFor([...tree.nodes.values()]);
  const root = tree.nodes.get(tree.rootId);

  if (root === undefined) {
    return null;
  }

  return (
    <section aria-label="Recursion tree" className="recursion-tree-panel">
      <h2>Recursion tree</h2>
      <ul className="recursion-tree" data-testid="recursion-tree">
        <RecursionTreeNode
          node={root}
          activeNodeId={frame.activeNodeId}
          activeBranch={activeBranch}
          childrenByParent={childrenByParent}
        />
      </ul>
    </section>
  );
}

interface RecursionTreeNodeProps {
  readonly node: RecursionNode;
  readonly activeNodeId: number | null;
  readonly activeBranch: ReadonlySet<number>;
  readonly childrenByParent: ReadonlyMap<number | null, readonly RecursionNode[]>;
}

function RecursionTreeNode({
  node,
  activeNodeId,
  activeBranch,
  childrenByParent
}: RecursionTreeNodeProps) {
  const children = childrenByParent.get(node.callEventId) ?? [];
  const isActive = node.callEventId === activeNodeId;
  const isActiveBranch = activeBranch.has(node.callEventId);
  const isCompleted = node.outcome !== null;

  return (
    <li className="recursion-tree-item">
      <article
        className="recursion-tree-node"
        data-node-id={node.callEventId}
        data-state={node.state}
        data-active={isActive}
        data-active-branch={isActiveBranch}
        data-completed={isCompleted}
      >
        <span className="recursion-tree-state">{node.state}</span>
        <span className="recursion-tree-meta">{formatNodeMeta(node)}</span>
      </article>

      {children.length > 0 ? (
        <ul className="recursion-tree-children">
          {children.map((child) => (
            <RecursionTreeNode
              key={child.callEventId}
              node={child}
              activeNodeId={activeNodeId}
              activeBranch={activeBranch}
              childrenByParent={childrenByParent}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function childrenByParentFor(nodes: readonly RecursionNode[]) {
  const childrenByParent = new Map<number | null, RecursionNode[]>();

  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parentCallId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentCallId, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.callEventId - b.callEventId);
  }

  return childrenByParent;
}

function activeBranchFor(frame: ExecutionFrame) {
  const activeBranch = new Set<number>();
  const tree = frame.recursionTree;

  if (tree === null || frame.activeNodeId === null) {
    return activeBranch;
  }

  let currentNode = tree.nodes.get(frame.activeNodeId);

  while (currentNode !== undefined) {
    activeBranch.add(currentNode.callEventId);
    currentNode =
      currentNode.parentCallId === null ? undefined : tree.nodes.get(currentNode.parentCallId);
  }

  return activeBranch;
}

function formatNodeMeta(node: RecursionNode) {
  if (node.outcome === null) {
    return "open";
  }

  return node.value === null ? node.outcome : `${node.outcome}: ${node.value}`;
}
