const nodes = [
  { cx: 120, cy: 160, r: 5, delay: "0s", duration: "6s" },
  { cx: 220, cy: 110, r: 4, delay: "0.6s", duration: "7s" },
  { cx: 340, cy: 190, r: 5, delay: "1.1s", duration: "6.5s" },
  { cx: 460, cy: 140, r: 4, delay: "0.3s", duration: "8s" },
  { cx: 150, cy: 280, r: 3.5, delay: "1.6s", duration: "7.5s" },
  { cx: 380, cy: 260, r: 5, delay: "0.9s", duration: "6.2s" },
  { cx: 500, cy: 230, r: 4, delay: "0.2s", duration: "7.2s" }
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
    <svg aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
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
        d="M-20,560 C40,560 60,540 90,560 C130,560 150,420 180,560 C220,560 245,300 270,560 C320,560 345,380 380,560 C430,560 455,500 490,560 L640,560"
        pathLength={1}
      />
    </svg>
  );
}
