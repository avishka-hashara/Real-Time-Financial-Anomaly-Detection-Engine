import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, ShieldCheck, Activity } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Swapped localhost to 127.0.0.1 to prevent Windows IPv6 routing quirks
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');

    ws.onopen = () => console.log("🟢 WebSocket Connected to Server!");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔵 Incoming Transaction:", data);
        setTransactions((prev) => [data, ...prev].slice(0, 50));
      } catch (err) {
        console.error("🔴 Failed to parse WebSocket message:", event.data);
      }
    };

    ws.onerror = (error) => console.error("🔴 WebSocket Error:", error);
    ws.onclose = () => console.log("⭕ WebSocket Disconnected");

    return () => ws.close();
  }, []);

  // Format data for the chart (reverse so timeline flows left-to-right)
  const chartData = [...transactions].reverse().map(tx => ({
    time: new Date(tx.timestamp).toLocaleTimeString(),
    risk: tx.risk_score
  }));

  const flaggedTx = transactions.find(t => t.risk_score > 70);

  return (
    <div
      className="min-h-screen bg-[#020617] text-white p-6 lg:p-8 relative overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Atmospheric glows */}
      <div className="absolute top-[-5%] left-[10%] w-[600px] h-[350px] bg-cyan-500/7 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[400px] bg-indigo-600/8 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Activity size={16} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white via-slate-100 to-cyan-400">
                Sentinel Anomaly Engine
              </h1>
              <p className="text-slate-500 mt-0.5 text-sm">Real-time LSTM + Isolation Forest Scoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-emerald-500/6 border border-emerald-500/20 px-4 py-2 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-emerald-400 font-semibold tracking-widest text-xs">SYSTEM LIVE</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Main Chart Panel */}
          <div className="col-span-1 lg:col-span-2 rounded-2xl border border-white/6 bg-white/2 backdrop-blur-xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Activity size={13} className="text-cyan-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">Live Risk Variance</h2>
              </div>
              <div className="text-[11px] text-slate-500 bg-white/3 border border-white/5 px-3 py-1 rounded-full">
                last {transactions.length} tx
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#334155', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#334155', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    width={26}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(2,6,23,0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '3px' }}
                    itemStyle={{ color: '#22d3ee', fontSize: '13px', fontWeight: '600' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fill="url(#riskGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#22d3ee', stroke: '#020617', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats / Alert Panel */}
          <div className="col-span-1 flex flex-col gap-5">

            {/* Throughput */}
            <div className="rounded-2xl border border-white/6 bg-white/2 backdrop-blur-xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex-1 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-28 h-28 bg-cyan-500/6 rounded-full filter blur-2xl pointer-events-none" />
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Throughput</p>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-5xl font-bold text-white tabular-nums leading-none">10</span>
                <span className="text-slate-500 text-sm mb-1 leading-none">tx/sec</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-cyan-400 text-xs font-medium">Redis Stream active</p>
              </div>
            </div>

            {/* Latest Flagged Event */}
            <div className="rounded-2xl border border-white/6 bg-white/2 backdrop-blur-xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex-1">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Latest Flagged Event</p>
              {flaggedTx ? (
                <div className="bg-rose-500/6 border border-rose-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs uppercase tracking-wider mb-3">
                    <ShieldAlert size={13} />
                    High Risk Detected
                  </div>
                  <div className="text-2xl font-bold text-white tabular-nums mb-1">
                    ${flaggedTx.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">User ID: {flaggedTx.user_id}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[88px] gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-emerald-400" />
                  </div>
                  <span className="text-xs text-slate-500">No recent anomalies</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Transaction Feed Table */}
          <div className="col-span-1 lg:col-span-3 rounded-2xl border border-white/6 bg-white/2 backdrop-blur-xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-white">Real-Time Ledger</h2>
              <span className="text-[11px] text-slate-500 bg-white/3 border border-white/5 px-3 py-1 rounded-full">
                {transactions.length} transactions
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Timestamp', 'User ID', 'Amount', 'Ground Truth', 'Risk Score'].map(h => (
                      <th key={h} className="pb-3 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((tx, idx) => {
                    const isHighRisk = tx.risk_score > 70;
                    const riskPct = Math.min(100, tx.risk_score);
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-white/3 transition-colors duration-150 ${
                          isHighRisk
                            ? 'bg-rose-500/4 hover:bg-rose-500/[0.07]'
                            : 'hover:bg-white/2'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-300 font-mono font-medium">
                          USR-{tx.user_id}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-white font-mono font-semibold tabular-nums">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${
                            tx.is_fraud === 1
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {tx.is_fraud === 1 ? 'FRAUD' : 'NORMAL'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isHighRisk ? 'bg-rose-500' : 'bg-cyan-400'}`}
                                style={{ width: `${riskPct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-mono font-semibold tabular-nums w-10 ${isHighRisk ? 'text-rose-400' : 'text-cyan-400'}`}>
                              {tx.risk_score.toFixed(1)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
