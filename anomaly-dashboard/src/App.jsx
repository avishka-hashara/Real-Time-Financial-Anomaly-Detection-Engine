import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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
        console.log("🔵 Incoming Transaction:", data); // Let's see the payload!
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

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 relative overflow-hidden font-sans">
      {/* Background Neon Orbs for Glass Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-fuchsia-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              Sentinel Anomaly Engine
            </h1>
            <p className="text-slate-400 mt-2">Real-time LSTM + Isolation Forest Scoring</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></div>
            <span className="text-cyan-400 font-medium tracking-wider text-sm">SYSTEM LIVE</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Chart Panel */}
          <div className="col-span-1 lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-cyan-400" />
              <h2 className="text-xl font-semibold">Live Risk Variance</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="risk"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats / Alert Panel */}
          <div className="col-span-1 flex flex-col gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex-1 flex flex-col justify-center">
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Throughput</h3>
              <div className="text-5xl font-bold text-white mb-2">10 <span className="text-xl text-slate-500">tx/sec</span></div>
              <p className="text-cyan-400 text-sm">Redis Stream active</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex-1">
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Latest Flagged Event</h3>
              {transactions.find(t => t.risk_score > 70) ? (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
                    <ShieldAlert size={20} /> HIGH RISK DETECTED
                  </div>
                  <div className="text-2xl font-mono text-white mb-1">${transactions.find(t => t.risk_score > 70).amount.toFixed(2)}</div>
                  <div className="text-sm text-slate-400">User ID: {transactions.find(t => t.risk_score > 70).user_id}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 text-emerald-400/50">
                  <ShieldCheck size={32} className="mb-2" />
                  <span className="text-sm">No recent anomalies</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Transaction Feed Table */}
          <div className="col-span-1 lg:col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden">
            <h2 className="text-xl font-semibold mb-6">Real-Time Ledger</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-sm">
                    <th className="pb-3 px-4 font-medium">Timestamp</th>
                    <th className="pb-3 px-4 font-medium">User ID</th>
                    <th className="pb-3 px-4 font-medium">Amount</th>
                    <th className="pb-3 px-4 font-medium">Ground Truth</th>
                    <th className="pb-3 px-4 font-medium">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono">
                  {transactions.slice(0, 10).map((tx, idx) => {
                    const isHighRisk = tx.risk_score > 70;
                    return (
                      <tr key={idx} className={`border-b border-white/5 transition-colors ${isHighRisk ? 'bg-rose-500/5' : 'hover:bg-white/5'}`}>
                        <td className="py-3 px-4 text-slate-300">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                        <td className="py-3 px-4">USR-{tx.user_id}</td>
                        <td className="py-3 px-4">${tx.amount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${tx.is_fraud === 1 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {tx.is_fraud === 1 ? 'FRAUD' : 'NORMAL'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isHighRisk ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-cyan-400'}`}></div>
                            <span className={isHighRisk ? 'text-rose-400 font-bold' : 'text-cyan-400'}>
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