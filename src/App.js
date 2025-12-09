import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Plus, Brain, RotateCcw, Moon, Sun } from 'lucide-react';

// Process Class
class Process {
  constructor(pid, arrivalTime, burstTime, priority) {
    this.pid = pid;
    this.arrivalTime = arrivalTime;
    this.burstTime = burstTime;
    this.priority = priority;
    this.remainingTime = burstTime;
    this.completionTime = 0;
    this.waitingTime = 0;
    this.turnaroundTime = 0;
    this.responseTime = -1;
  }
}

// Scheduling Algorithms
const schedulingAlgorithms = {
  fcfs: (processes) => {
    const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const gantt = [];
    
    sorted.forEach(p => {
      if (currentTime < p.arrivalTime) currentTime = p.arrivalTime;
      
      gantt.push({ pid: p.pid, start: currentTime, duration: p.burstTime });
      
      p.responseTime = currentTime - p.arrivalTime;
      currentTime += p.burstTime;
      p.completionTime = currentTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
    });
    
    return { processes: sorted, gantt };
  },
  
  sjf: (processes) => {
    const ready = [];
    const completed = [];
    let currentTime = 0;
    const gantt = [];
    const remaining = [...processes];
    
    while (completed.length < processes.length) {
      const arrived = remaining.filter(p => p.arrivalTime <= currentTime);
      arrived.forEach(p => {
        if (!ready.includes(p)) ready.push(p);
      });
      remaining.splice(0, remaining.length, ...remaining.filter(p => p.arrivalTime > currentTime));
      
      if (ready.length === 0) {
        currentTime++;
        continue;
      }
      
      ready.sort((a, b) => a.burstTime - b.burstTime);
      const p = ready.shift();
      
      gantt.push({ pid: p.pid, start: currentTime, duration: p.burstTime });
      
      p.responseTime = currentTime - p.arrivalTime;
      currentTime += p.burstTime;
      p.completionTime = currentTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      
      completed.push(p);
    }
    
    return { processes: completed, gantt };
  },
  
  priority: (processes) => {
    const ready = [];
    const completed = [];
    let currentTime = 0;
    const gantt = [];
    const remaining = [...processes];
    
    while (completed.length < processes.length) {
      const arrived = remaining.filter(p => p.arrivalTime <= currentTime);
      arrived.forEach(p => {
        if (!ready.includes(p)) ready.push(p);
      });
      remaining.splice(0, remaining.length, ...remaining.filter(p => p.arrivalTime > currentTime));
      
      if (ready.length === 0) {
        currentTime++;
        continue;
      }
      
      ready.sort((a, b) => a.priority - b.priority);
      const p = ready.shift();
      
      gantt.push({ pid: p.pid, start: currentTime, duration: p.burstTime });
      
      p.responseTime = currentTime - p.arrivalTime;
      currentTime += p.burstTime;
      p.completionTime = currentTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;
      
      completed.push(p);
    }
    
    return { processes: completed, gantt };
  },
  
  roundRobin: (processes, quantum = 2) => {
    const ready = [];
    const completed = [];
    let currentTime = 0;
    const gantt = [];
    const remaining = processes.map(p => ({ ...p, remainingTime: p.burstTime, firstRun: true }));
    
    remaining.sort((a, b) => a.arrivalTime - b.arrivalTime);
    ready.push(remaining.shift());
    
    while (completed.length < processes.length) {
      if (ready.length === 0) {
        if (remaining.length > 0) {
          ready.push(remaining.shift());
          currentTime = ready[0].arrivalTime;
        }
        continue;
      }
      
      const p = ready.shift();
      
      if (p.firstRun) {
        p.responseTime = currentTime - p.arrivalTime;
        p.firstRun = false;
      }
      
      const execTime = Math.min(quantum, p.remainingTime);
      gantt.push({ pid: p.pid, start: currentTime, duration: execTime });
      
      currentTime += execTime;
      p.remainingTime -= execTime;
      
      const newArrivals = remaining.filter(r => r.arrivalTime <= currentTime);
      newArrivals.forEach(r => ready.push(r));
      remaining.splice(0, remaining.length, ...remaining.filter(r => r.arrivalTime > currentTime));
      
      if (p.remainingTime > 0) {
        ready.push(p);
      } else {
        p.completionTime = currentTime;
        p.turnaroundTime = p.completionTime - p.arrivalTime;
        p.waitingTime = p.turnaroundTime - p.burstTime;
        completed.push(p);
      }
    }
    
    return { processes: completed, gantt };
  }
};

// ML Recommendation
const recommendAlgorithm = (processes) => {
  const avgBurst = processes.reduce((sum, p) => sum + p.burstTime, 0) / processes.length;
  const burstVariance = processes.reduce((sum, p) => sum + Math.pow(p.burstTime - avgBurst, 2), 0) / processes.length;
  const hasPriority = processes.some(p => p.priority !== 0);
  
  if (burstVariance < 5 && !hasPriority) return 'fcfs';
  if (burstVariance > 20) return 'sjf';
  if (hasPriority) return 'priority';
  return 'roundRobin';
};

const CPUSchedulerSimulator = () => {
  const [processes, setProcesses] = useState([
    new Process('P1', 0, 5, 2),
    new Process('P2', 1, 3, 1),
    new Process('P3', 2, 8, 3)
  ]);
  const [newProcess, setNewProcess] = useState({ pid: '', arrival: '', burst: '', priority: '' });
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('fcfs');
  const [results, setResults] = useState(null);
  const [quantum, setQuantum] = useState(2);
  const [recommendation, setRecommendation] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const addProcess = () => {
    if (newProcess.pid && newProcess.arrival !== '' && newProcess.burst !== '') {
      const p = new Process(
        newProcess.pid,
        parseInt(newProcess.arrival),
        parseInt(newProcess.burst),
        parseInt(newProcess.priority) || 0
      );
      setProcesses([...processes, p]);
      setNewProcess({ pid: '', arrival: '', burst: '', priority: '' });
    }
  };

  const simulate = () => {
    const processCopies = processes.map(p => new Process(p.pid, p.arrivalTime, p.burstTime, p.priority));
    const result = selectedAlgorithm === 'roundRobin' 
      ? schedulingAlgorithms[selectedAlgorithm](processCopies, quantum)
      : schedulingAlgorithms[selectedAlgorithm](processCopies);
    
    const avgWaiting = result.processes.reduce((sum, p) => sum + p.waitingTime, 0) / result.processes.length;
    const avgTurnaround = result.processes.reduce((sum, p) => sum + p.turnaroundTime, 0) / result.processes.length;
    
    setResults({ ...result, avgWaiting, avgTurnaround });
  };

  const getRecommendation = () => {
    const rec = recommendAlgorithm(processes);
    const names = {
      fcfs: 'FCFS (First Come First Serve)',
      sjf: 'SJF (Shortest Job First)',
      priority: 'Priority Scheduling',
      roundRobin: 'Round Robin'
    };
    setRecommendation(`ML Recommendation: ${names[rec]}`);
  };

  const reset = () => {
    setResults(null);
    setRecommendation('');
  };

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Theme Toggle Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-lg transition flex items-center gap-2 ${
              isDarkMode 
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-lg'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <h1 className={`text-4xl font-bold mb-2 text-center ${
          isDarkMode 
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500' 
            : 'text-indigo-900'
        }`}>
          Intelligent CPU Scheduler Simulator
        </h1>
        <p className={`text-center mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Simulate, Analyze, and Optimize CPU Scheduling Algorithms
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Process Input */}
          <div className={`rounded-lg shadow-lg p-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Process Management
            </h2>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              <input
                type="text"
                placeholder="PID"
                className={`border-2 rounded px-3 py-2 focus:outline-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500' 
                    : 'border-gray-300 focus:border-indigo-500'
                }`}
                value={newProcess.pid}
                onChange={(e) => setNewProcess({...newProcess, pid: e.target.value})}
              />
              <input
                type="number"
                placeholder="Arrival"
                className={`border-2 rounded px-3 py-2 focus:outline-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500' 
                    : 'border-gray-300 focus:border-indigo-500'
                }`}
                value={newProcess.arrival}
                onChange={(e) => setNewProcess({...newProcess, arrival: e.target.value})}
              />
              <input
                type="number"
                placeholder="Burst"
                className={`border-2 rounded px-3 py-2 focus:outline-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500' 
                    : 'border-gray-300 focus:border-indigo-500'
                }`}
                value={newProcess.burst}
                onChange={(e) => setNewProcess({...newProcess, burst: e.target.value})}
              />
              <input
                type="number"
                placeholder="Priority"
                className={`border-2 rounded px-3 py-2 focus:outline-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500' 
                    : 'border-gray-300 focus:border-indigo-500'
                }`}
                value={newProcess.priority}
                onChange={(e) => setNewProcess({...newProcess, priority: e.target.value})}
              />
            </div>
            
            <button
              onClick={addProcess}
              className={`w-full text-white py-2 rounded-lg transition flex items-center justify-center gap-2 mb-4 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Plus size={20} /> Add Process
            </button>

            <div className={`max-h-64 overflow-y-auto rounded-lg ${isDarkMode ? 'border border-gray-700' : ''}`}>
              <table className="w-full">
                <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                  <tr>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>PID</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Arrival</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Burst</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p, idx) => (
                    <tr key={idx} className={`border-b ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-750' : 'hover:bg-gray-50'
                    }`}>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{p.pid}</td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{p.arrivalTime}</td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{p.burstTime}</td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{p.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Algorithm Selection */}
          <div className={`rounded-lg shadow-lg p-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Algorithm Configuration
            </h2>
            
            <label className={`block mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Algorithm:
            </label>
            <select
              className={`w-full border-2 rounded px-4 py-2 mb-4 focus:outline-none ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500' 
                  : 'border-gray-300 focus:border-indigo-500'
              }`}
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value)}
            >
              <option value="fcfs">FCFS (First Come First Serve)</option>
              <option value="sjf">SJF (Shortest Job First)</option>
              <option value="priority">Priority Scheduling</option>
              <option value="roundRobin">Round Robin</option>
            </select>

            {selectedAlgorithm === 'roundRobin' && (
              <div className="mb-4">
                <label className={`block mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Time Quantum:
                </label>
                <input
                  type="number"
                  className={`w-full border-2 rounded px-4 py-2 focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500' 
                      : 'border-gray-300 focus:border-indigo-500'
                  }`}
                  value={quantum}
                  onChange={(e) => setQuantum(parseInt(e.target.value))}
                  min="1"
                />
              </div>
            )}

            <button
              onClick={getRecommendation}
              className={`w-full text-white py-3 rounded-lg transition flex items-center justify-center gap-2 mb-3 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Brain size={20} /> Algorithm Recommendation
            </button>

            {recommendation && (
              <div className={`border-2 rounded-lg p-3 mb-3 text-center font-medium ${
                isDarkMode 
                  ? 'bg-purple-900 bg-opacity-40 border-purple-500 text-purple-200' 
                  : 'bg-purple-50 border-purple-300 text-purple-800'
              }`}>
                {recommendation}
              </div>
            )}

            <button
              onClick={simulate}
              disabled={processes.length === 0}
              className={`w-full text-white py-3 rounded-lg transition flex items-center justify-center gap-2 mb-2 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700' 
                  : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
              }`}
            >
              <Play size={20} /> Run Simulation
            </button>

            <button
              onClick={reset}
              className={`w-full text-white py-3 rounded-lg transition flex items-center justify-center gap-2 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <RotateCcw size={20} /> Reset Results
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className={`rounded-lg shadow-lg p-6 mb-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Simulation Results
            </h2>
            
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`rounded-lg p-4 text-center ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700' 
                  : 'bg-blue-50'
              }`}>
                <div className={`text-3xl font-bold ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>
                  {results.avgWaiting.toFixed(2)}
                </div>
                <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Average Waiting Time</div>
              </div>
              <div className={`rounded-lg p-4 text-center ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-green-900 to-green-800 border border-green-700' 
                  : 'bg-green-50'
              }`}>
                <div className={`text-3xl font-bold ${isDarkMode ? 'text-green-200' : 'text-green-600'}`}>
                  {results.avgTurnaround.toFixed(2)}
                </div>
                <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Average Turnaround Time</div>
              </div>
            </div>

            {/* Gantt Chart */}
            <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Gantt Chart
            </h3>
            <div className={`rounded-lg p-4 mb-6 overflow-x-auto ${
              isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-100'
            }`}>
              <div className="flex min-w-max">
                {results.gantt.map((g, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div
                      className={`h-16 flex items-center justify-center text-white font-semibold ${
                        isDarkMode ? 'border-2 border-gray-600' : 'border-2 border-white'
                      }`}
                      style={{
                        width: `${g.duration * 40}px`,
                        backgroundColor: colors[processes.findIndex(p => p.pid === g.pid) % colors.length]
                      }}
                    >
                      {g.pid}
                    </div>
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                      {g.start}
                    </div>
                  </div>
                ))}
                <div className="flex flex-col items-center">
                  <div className="h-16"></div>
                  <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    {results.gantt[results.gantt.length - 1].start + results.gantt[results.gantt.length - 1].duration}
                  </div>
                </div>
              </div>
            </div>

            {/* Process Details */}
            <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Process Details
            </h3>
            <div className={`overflow-x-auto rounded-lg mb-6 ${isDarkMode ? 'border border-gray-700' : ''}`}>
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}>
                  <tr>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>PID</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Arrival</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Burst</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Completion</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Waiting</th>
                    <th className={`px-4 py-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Turnaround</th>
                  </tr>
                </thead>
                <tbody>
                  {results.processes.map((p, idx) => (
                    <tr key={idx} className={`border-b ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-750' : 'hover:bg-gray-50'
                    }`}>
                      <td className={`px-4 py-2 font-semibold ${
                        isDarkMode ? 'text-blue-400' : 'text-gray-900'
                      }`}>{p.pid}</td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {p.arrivalTime}
                      </td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {p.burstTime}
                      </td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {p.completionTime}
                      </td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {p.waitingTime}
                      </td>
                      <td className={`px-4 py-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {p.turnaroundTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance Comparison Chart */}
            <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Performance Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.processes}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="pid" stroke={isDarkMode ? '#9ca3af' : '#4b5563'} />
                <YAxis stroke={isDarkMode ? '#9ca3af' : '#4b5563'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '0.5rem',
                    color: isDarkMode ? '#e5e7eb' : '#1f2937'
                  }} 
                />
                <Legend wrapperStyle={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }} />
                <Bar dataKey="waitingTime" fill="#3b82f6" name="Waiting Time" />
                <Bar dataKey="turnaroundTime" fill="#10b981" name="Turnaround Time" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default CPUSchedulerSimulator;