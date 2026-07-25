export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
  children: TocHeading[];
}

export function buildTocTree(
  headings: { depth: number; slug: string; text: string }[]
): TocHeading[] {
  const root: TocHeading[] = [];
  const stack: TocHeading[] = [];

  for (const h of headings) {
    if (h.depth < 2) continue;
    const node: TocHeading = { ...h, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].depth >= h.depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return root;
}
