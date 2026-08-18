import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Award,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { Candidate, ElectionState, Position, Voter } from '../types';

interface AnalyticsDashboardProps {
  electionState: ElectionState;
}

const COLOR_PALETTE = [
  '#00923f', // Ghana Green
  '#fcd116', // Ghana Gold
  '#ce1126', // Ghana Red
  '#0284c7', // Sky Blue
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0d9488', // Teal
  '#4f46e5', // Indigo
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ electionState }) => {
  const { positions, candidates, votes, voters, config } = electionState;

  const voterList = Object.values(voters) as Voter[];
  const totalVoters = voterList.length;
  const votedCount = voterList.filter((v) => v.status === 'VOTED').length;
  const pendingCount = Math.max(0, totalVoters - votedCount);
  const turnoutPercentage = totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(1) : '0.0';

  const [selectedPositionId, setSelectedPositionId] = useState<string>('ALL');

  // Compute votes tally per candidate
  const getCandidateVotes = (candidateId: string) => {
    return votes.filter((v) => Object.values(v.selections).includes(candidateId)).length;
  };

  // Turnout Pie Data
  const turnoutPieData = [
    { name: 'Voted', value: votedCount, color: '#00923f' },
    { name: 'Pending', value: pendingCount, color: '#e2e8f0' },
  ];

  // Helper to format chart data for a specific position
  const getPositionChartData = (pos: Position) => {
    const posCandidates = candidates.filter((c) => c.positionId === pos.id);
    const totalPosVotes = posCandidates.reduce((acc, c) => acc + getCandidateVotes(c.id), 0);

    return posCandidates.map((c, index) => {
      const tally = getCandidateVotes(c.id);
      const percentage = totalPosVotes > 0 ? ((tally / totalPosVotes) * 100).toFixed(1) : '0.0';
      return {
        id: c.id,
        name: c.name,
        shortName: c.name.split(' ')[0],
        votes: tally,
        percentage: Number(percentage),
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      };
    });
  };

  // Handle Printable Report Generation
  const handlePrintReport = () => {
    window.print();
  };

  // Export CSV Report
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `OFFICIAL ELECTORAL RESULTS REPORT - ${config.clubName} (${config.year})\n`;
    csvContent += `Report Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Total Eligible Voters: ${totalVoters}\n`;
    csvContent += `Total Ballots Cast: ${votedCount} (${turnoutPercentage}% Turnout)\n\n`;

    positions.forEach((pos) => {
      csvContent += `POSITION: ${pos.title.toUpperCase()}\n`;
      csvContent += `Candidate Name,Department,Votes Received,Percentage\n`;

      const posCandidates = candidates.filter((c) => c.positionId === pos.id);
      const totalPosVotes = posCandidates.reduce((acc, c) => acc + getCandidateVotes(c.id), 0);

      posCandidates.forEach((c) => {
        const tally = getCandidateVotes(c.id);
        const pct = totalPosVotes > 0 ? ((tally / totalPosVotes) * 100).toFixed(1) : '0.0';
        csvContent += `"${c.name}","${c.titleAndDept}",${tally},${pct}%\n`;
      });
      csvContent += '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Electoral_Report_${config.clubName.replace(/\s+/g, '_')}_${config.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 text-slate-800 print:bg-white print:p-0">
      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase text-slate-900">{config.clubName}</h1>
        <h2 className="text-base font-bold text-slate-700 uppercase">
          Official Executive Election Results Report ({config.year})
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Generated on {new Date().toLocaleString()} | Total Voters: {totalVoters} | Ballots Cast: {votedCount} ({turnoutPercentage}%)
        </p>
      </div>

      {/* DASHBOARD TOP CONTROL BANNER */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#00923f] text-[10px] font-extrabold uppercase tracking-wider">
              Electoral Intelligence & Analytics
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">Real-Time Data Visualizations</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight mt-1">
            Voting Analytics & Certified Results Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Interactive visual bar charts, vote share distribution pie charts, voter turnout statistics, and official report generation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#00923f]" />
            <span>Export CSV Report</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="px-4 py-2 bg-[#00923f] hover:bg-[#007a34] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Eligible Voters</span>
            <Users className="w-4 h-4 text-[#00923f]" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{totalVoters}</div>
          <p className="text-[10px] font-medium text-slate-500">Registered in voter roster</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Ballots Cast</span>
            <CheckCircle2 className="w-4 h-4 text-[#00923f]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#00923f]">{votedCount}</div>
          <p className="text-[10px] font-medium text-slate-500">Total votes submitted</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Voter Turnout</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600">{turnoutPercentage}%</div>
          <p className="text-[10px] font-medium text-slate-500">Participation rate</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Executive Offices</span>
            <Award className="w-4 h-4 text-[#00923f]" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">{positions.length}</div>
          <p className="text-[10px] font-medium text-slate-500">Contested positions</p>
        </div>
      </div>

      {/* OVERALL TURNOUT PIE CHART & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TURNOUT DONUT CHART */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#00923f]" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Voter Participation Share
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#00923f]">{turnoutPercentage}% Turnout</span>
          </div>

          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={turnoutPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {turnoutPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} voters`, 'Count']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black font-mono text-slate-900">{votedCount}</span>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Voted</span>
            </div>
          </div>
        </div>

        {/* ELECTION OVERVIEW SUMMARY */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00923f]" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Official Election Overview
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold font-mono">
                {config.year}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              This analytics console dynamically aggregates immutable ballot tokens submitted across all executive positions. All votes are processed through cryptographic blind hashes ensuring zero voter identity linkability.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Organization</span>
                <span className="text-xs font-bold text-slate-900">{config.clubName}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Total Candidates</span>
                <span className="text-xs font-bold text-slate-900">{candidates.length} Registered</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#00923f] shrink-0" />
            <div className="text-xs text-slate-800">
              <strong className="text-[#00923f] font-bold">Analytics Status:</strong> All vote counts and leading percentages are continuously updated as voters submit ballots.
            </div>
          </div>
        </div>
      </div>

      {/* FILTER POSITION SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00923f]" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Filter Position Analytics:
          </span>
        </div>

        <select
          value={selectedPositionId}
          onChange={(e) => setSelectedPositionId(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-[#00923f]"
        >
          <option value="ALL">Show All Executive Positions</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* POSITION BY POSITION BAR CHARTS & PIE CHARTS */}
      <div className="space-y-8">
        {positions
          .filter((p) => selectedPositionId === 'ALL' || selectedPositionId === p.id)
          .map((position) => {
            const chartData = getPositionChartData(position);
            const totalPosVotes = chartData.reduce((acc, curr) => acc + curr.votes, 0);

            // Find leading candidate
            const sortedChartData = [...chartData].sort((a, b) => b.votes - a.votes);
            const leader = sortedChartData[0];

            return (
              <div
                key={position.id}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 break-inside-avoid"
              >
                {/* POSITION TITLE & LEADER BADGE */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <span>{position.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                        {chartData.length} Candidates
                      </span>
                    </h3>
                    {position.description && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{position.description}</p>
                    )}
                  </div>

                  {leader && leader.votes > 0 && (
                    <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>
                        Leading Candidate: <strong className="text-slate-900">{leader.name}</strong> ({leader.votes} votes - {leader.percentage}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* CHARTS GRID FOR THIS POSITION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* BAR CHART */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-[#00923f]" />
                      <span>Vote Count Tally (Bar Chart)</span>
                    </h4>
                    <div className="h-64 bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="shortName" stroke="#64748b" fontSize={11} fontWeight="bold" />
                          <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                          <Tooltip
                            formatter={(value: any) => [`${value} Votes`, 'Tally']}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                          />
                          <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* PIE CHART */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <PieChartIcon className="w-4 h-4 text-[#00923f]" />
                      <span>Percentage Vote Share (Pie Chart)</span>
                    </h4>
                    <div className="h-64 bg-slate-50 border border-slate-100 rounded-xl p-4">
                      {totalPosVotes > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="votes"
                              label={({ name, percentage }) => `${name.split(' ')[0]} (${percentage}%)`}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`pie-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any) => [`${value} Votes`, 'Count']}
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                          No votes recorded yet for this position.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DETAILED RESULTS TABLE FOR POSITION */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4">Candidate</th>
                        <th className="py-2.5 px-4">Department</th>
                        <th className="py-2.5 px-4">Votes Received</th>
                        <th className="py-2.5 px-4">Vote Share</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800 bg-white">
                      {chartData.map((c, i) => {
                        const isWinner = leader && leader.id === c.id && c.votes > 0;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                              {candidates.find((item) => item.id === c.id)?.photoUrl ? (
                                <img
                                  src={candidates.find((item) => item.id === c.id)?.photoUrl}
                                  alt={c.name}
                                  referrerPolicy="no-referrer"
                                  className="w-7 h-7 rounded-full object-cover border border-slate-300 shrink-0 shadow-2xs"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span
                                  className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-300"
                                >
                                  {c.name.charAt(0)}
                                </span>
                              )}
                              <span>{c.name}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {candidates.find((item) => item.id === c.id)?.titleAndDept || '—'}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{c.votes}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-[#00923f]">
                              {c.percentage}%
                            </td>
                            <td className="py-2.5 px-4">
                              {isWinner ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300 flex items-center gap-1 w-fit">
                                  <Award className="w-3 h-3 text-amber-600" />
                                  <span>Leader</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-mono">Contesting</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
