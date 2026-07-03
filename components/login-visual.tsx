// Nodes and the trace are kept in the top ~55% of the 0-800 viewBox on
// purpose: the caption text is pinned to the bottom of the panel (see
// .auth-visual-copy), so the artwork must stay clear of that band
// regardless of how "slice" scaling crops the SVG at different panel
// aspect ratios.
const nodes = [
  { cx: 120, cy: 110, r: 5, delay: "0s", duration: "6s" },
  { cx: 220, cy: 70, r: 4, delay: "0.6s", duration: "7s" },
  { cx: 340, cy: 130, r: 5, delay: "1.1s", duration: "6.5s" },
  { cx: 460, cy: 90, r: 4, delay: "0.3s", duration: "8s" },
  { cx: 150, cy: 200, r: 3.5, delay: "1.6s", duration: "7.5s" },
  { cx: 380, cy: 180, r: 5, delay: "0.9s", duration: "6.2s" },
  { cx: 500, cy: 160, r: 4, delay: "0.2s", duration: "7.2s" }
];

const links: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [4, 1],
  [5, 3],
  [5, 6]
];

export function LoginVisual() {
  return (
    <svg aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax slice" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
      {links.map(([a, b], index) => (
        <line
          className="auth-link-line"
          key={`link-${index}`}
          x1={nodes[a].cx}
          x2={nodes[b].cx}
          y1={nodes[a].cy}
          y2={nodes[b].cy}
        />
      ))}
      {nodes.map((node, index) => (
        <circle
          className="auth-node"
          cx={node.cx}
          cy={node.cy}
          key={`node-${index}`}
          r={node.r}
          style={{ animationDelay: node.delay, animationDuration: node.duration }}
        />
      ))}
      <path
        className="auth-trace"
        d="M-20,440 C40,440 60,420 90,440 C130,440 150,300 180,440 C220,440 245,180 270,440 C320,440 345,260 380,440 C430,440 455,380 490,440 L640,440"
        pathLength={1}
      />
    </svg>
  );
}
