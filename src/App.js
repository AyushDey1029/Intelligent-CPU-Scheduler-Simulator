import React, { useState, useEffect } from 'react';
import { Play, Plus, Brain, RotateCcw } from 'lucide-react';

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

// Algorithm Recommendation
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
    setRecommendation(`Algorithm Recommendation: ${names[rec]}`);
  };

  const reset = () => {
    setResults(null);
    setRecommendation('');
  };

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-indigo-900 mb-2 text-center">
          Intelligent CPU Scheduler Simulator
        </h1>
        <p className="text-center text-gray-600 mb-8">Simulate, Analyze, and Optimize CPU Scheduling Algorithms</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Process Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Process Management</h2>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              <input
                type="text"
                placeholder="PID"
                className="border-2 border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:outline-none"
                value={newProcess.pid}
                onChange={(e) => setNewProcess({...newProcess, pid: e.target.value})}
              />
              <input
                type="number"
                placeholder="Arrival"
                className="border-2 border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:outline-none"
                value={newProcess.arrival}
                onChange={(e) => setNewProcess({...newProcess, arrival: e.target.value})}
              />
              <input
                type="number"
                placeholder="Burst"
                className="border-2 border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:outline-none"
                value={newProcess.burst}
                onChange={(e) => setNewProcess({...newProcess, burst: e.target.value})}
              />
              <input
                type="number"
                placeholder="Priority"
                className="border-2 border-gray-300 rounded px-3 py-2 focus:border-indigo-500 focus:outline-none"
                value={newProcess.priority}
                onChange={(e) => setNewProcess({...newProcess, priority: e.target.value})}
              />
            </div>
            
            <button
              onClick={addProcess}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 mb-4"
            >
              <Plus size={20} /> Add Process
            </button>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">PID</th>
                    <th className="px-4 py-2 text-left">Arrival</th>
                    <th className="px-4 py-2 text-left">Burst</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{p.pid}</td>
                      <td className="px-4 py-2">{p.arrivalTime}</td>
                      <td className="px-4 py-2">{p.burstTime}</td>
                      <td className="px-4 py-2">{p.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Algorithm Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Algorithm Configuration</h2>
            
            <label className="block mb-2 text-gray-700 font-medium">Select Algorithm:</label>
            <select
              className="w-full border-2 border-gray-300 rounded px-4 py-2 mb-4 focus:border-indigo-500 focus:outline-none"
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
                <label className="block mb-2 text-gray-700 font-medium">Time Quantum:</label>
                <input
                  type="number"
                  className="w-full border-2 border-gray-300 rounded px-4 py-2 focus:border-indigo-500 focus:outline-none"
                  value={quantum}
                  onChange={(e) => setQuantum(parseInt(e.target.value))}
                  min="1"
                />
              </div>
            )}

            <button
              onClick={getRecommendation}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 mb-3"
            >
              <Brain size={20} /> Algorithm Recommendation
            </button>

            {recommendation && (
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3 mb-3 text-purple-800 text-center font-medium">
                {recommendation}
              </div>
            )}

            <button
              onClick={simulate}
              disabled={processes.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 mb-2 disabled:bg-gray-400"
            >
              <Play size={20} /> Run Simulation
            </button>

            <button
              onClick={reset}
              className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} /> Reset Results
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Simulation Results</h2>
            
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{results.avgWaiting.toFixed(2)}</div>
                <div className="text-gray-700">Average Waiting Time</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{results.avgTurnaround.toFixed(2)}</div>
                <div className="text-gray-700">Average Turnaround Time</div>
              </div>
            </div>

            {/* Gantt Chart */}
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Gantt Chart</h3>
            <div className="bg-gray-100 rounded-lg p-4 mb-6 overflow-x-auto">
              <div className="flex min-w-max">
                {results.gantt.map((g, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div
                      className="h-16 flex items-center justify-center text-white font-semibold border-2 border-white"
                      style={{
                        width: `${g.duration * 40}px`,
                        backgroundColor: colors[processes.findIndex(p => p.pid === g.pid) % colors.length]
                      }}
                    >
                      {g.pid}
                    </div>
                    <div className="text-xs mt-1">{g.start}</div>
                  </div>
                ))}
                <div className="flex flex-col items-center">
                  <div className="h-16"></div>
                  <div className="text-xs mt-1">{results.gantt[results.gantt.length - 1].start + results.gantt[results.gantt.length - 1].duration}</div>
                </div>
              </div>
            </div>

            {/* Process Details */}
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Process Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">PID</th>
                    <th className="px-4 py-2 text-left">Arrival</th>
                    <th className="px-4 py-2 text-left">Burst</th>
                    <th className="px-4 py-2 text-left">Completion</th>
                    <th className="px-4 py-2 text-left">Waiting</th>
                    <th className="px-4 py-2 text-left">Turnaround</th>
                  </tr>
                </thead>
                <tbody>
                  {results.processes.map((p, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold">{p.pid}</td>
                      <td className="px-4 py-2">{p.arrivalTime}</td>
                      <td className="px-4 py-2">{p.burstTime}</td>
                      <td className="px-4 py-2">{p.completionTime}</td>
                      <td className="px-4 py-2">{p.waitingTime}</td>
                      <td className="px-4 py-2">{p.turnaroundTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CPUSchedulerSimulator;