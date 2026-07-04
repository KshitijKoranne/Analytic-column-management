"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const palette = ["#0866cc", "#146c43", "#a16207", "#b42318", "#7c3aed", "#0e7490", "#c2410c", "#4338ca"];

type ChartRow = { label: string; value: number };

export function DashboardCharts({ byType, byStatus }: { byType: ChartRow[]; byStatus: ChartRow[] }) {
  return (
    <div className="dashboard-grid">
      <div className="dashboard-panel">
        <h2>Column type</h2>
        {byType.length ? (
          <div className="chart-box">
            <ResponsiveContainer height={220} width="100%">
              <BarChart data={byType} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis axisLine={{ stroke: "#dfe4ec" }} dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={{ fontSize: 11 }} tickLine={false} width={28} />
                <Tooltip contentStyle={{ border: "1px solid #dfe4ec", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "#f5f7fb" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byType.map((entry, index) => (
                    <Cell fill={palette[index % palette.length]} key={entry.label} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-row">No records</div>
        )}
      </div>

      <div className="dashboard-panel">
        <h2>Column status</h2>
        {byStatus.length ? (
          <div className="chart-box chart-box-split">
            <ResponsiveContainer height={200} width="55%">
              <PieChart>
                <Tooltip contentStyle={{ border: "1px solid #dfe4ec", borderRadius: 8, fontSize: 12 }} />
                <Pie data={byStatus} dataKey="value" innerRadius={48} nameKey="label" outerRadius={80} paddingAngle={2}>
                  {byStatus.map((entry, index) => (
                    <Cell fill={palette[index % palette.length]} key={entry.label} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <ul className="chart-legend">
              {byStatus.map((entry, index) => (
                <li key={entry.label}>
                  <span style={{ background: palette[index % palette.length] }} />
                  {entry.label} <strong>{entry.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="empty-row">No records</div>
        )}
      </div>
    </div>
  );
}
