import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Package, 
  Briefcase, 
  AlertCircle, 
  TrendingUp, 
  Layers, 
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Tender } from '../types';

interface ProcurementNatureChartProps {
  tenders: Tender[];
}

export default function ProcurementNatureChart({ tenders }: ProcurementNatureChartProps) {
  const [filterActive, setFilterActive] = useState<boolean>(true);

  // Helper to parse whether tender is active based on selling deadline
  const isActiveTender = (tender: Tender): boolean => {
    if (!tender.documentLastSellingDate || tender.documentLastSellingDate === 'N/A') {
      return true;
    }
    try {
      const parts = tender.documentLastSellingDate.split(' ');
      const datePart = parts[0];
      const timePart = parts[1] || '17:05';
      
      const dateParts = datePart.split('-');
      const timeParts = timePart.split(':');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const hoursVal = timeParts[0] ? parseInt(timeParts[0], 10) : 17;
        const minutesVal = timeParts[1] ? parseInt(timeParts[1], 10) : 5;
        
        const deadlineDate = new Date(year, month, day, hoursVal, minutesVal, 0);
        // Compare with current simulated or actual date (May 29, 2026 is current simulated date)
        const currentRefTime = new Date('2026-05-29T08:15:00Z').getTime();
        return deadlineDate.getTime() > currentRefTime;
      }
    } catch (e) {
      // fallback
    }
    return true;
  };

  // Process data
  const chartData = useMemo(() => {
    const list = filterActive ? tenders.filter(isActiveTender) : tenders;
    
    let goodsCount = 0;
    let worksCount = 0;
    let servicesCount = 0;
    let totalValueGoods = 0;
    let totalValueWorks = 0;
    let totalValueServices = 0;

    list.forEach(t => {
      const nature = (t.procurementNature || '').toLowerCase();
      const val = t.estimatedCostAmt || 0;
      if (nature.includes('good')) {
        goodsCount++;
        totalValueGoods += val;
      } else if (nature.includes('work')) {
        worksCount++;
        totalValueWorks += val;
      } else if (nature.includes('service')) {
        servicesCount++;
        totalValueServices += val;
      } else {
        // Classify standard matching or fall back
        goodsCount++;
        totalValueGoods += val;
      }
    });

    const totalCount = goodsCount + worksCount + servicesCount;

    return {
      totalCount,
      summary: [
        {
          name: 'Goods',
          count: goodsCount,
          percentage: totalCount > 0 ? Math.round((goodsCount / totalCount) * 100) : 0,
          totalValue: totalValueGoods,
          color: '#6366F1', // Indigo text/theme
          bgLight: 'rgba(99, 102, 241, 0.08)',
          gradient: ['#818CF8', '#6366F1'],
          description: 'Supplies, machinery, computers, healthcare equipment, and standard materials.'
        },
        {
          name: 'Works',
          count: worksCount,
          percentage: totalCount > 0 ? Math.round((worksCount / totalCount) * 100) : 0,
          totalValue: totalValueWorks,
          color: '#10B981', // Emerald theme
          bgLight: 'rgba(16, 185, 129, 0.08)',
          gradient: ['#34D399', '#10B981'],
          description: 'Construction, engineering installation, infrastructure repairs, and civil works.'
        },
        {
          name: 'Services',
          count: servicesCount,
          percentage: totalCount > 0 ? Math.round((servicesCount / totalCount) * 100) : 0,
          totalValue: totalValueServices,
          color: '#0EA5E9', // Sky blue theme
          bgLight: 'rgba(14, 165, 233, 0.08)',
          gradient: ['#38BDF8', '#0EA5E9'],
          description: 'Consultancies, advisory support, cleaning, maintenance, and technical training.'
        }
      ]
    };
  }, [tenders, filterActive]);

  // Determine top sector
  const topSector = useMemo(() => {
    let top = chartData.summary[0];
    chartData.summary.forEach(item => {
      if (item.count > top.count) {
        top = item;
      }
    });
    return top;
  }, [chartData]);

  // format budget
  const formatBDTShort = (num: number) => {
    if (num >= 10000000) {
      return `৳${(num / 10000000).toFixed(1)} Crore`;
    } else if (num >= 100000) {
      return `৳${(num / 100000).toFixed(1)} Lakh`;
    }
    return `৳${num.toLocaleString()}`;
  };

  return (
    <div id="procurement-nature-section" className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-5">
      
      {/* Header and Filter Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-[#1E293B] uppercase tracking-wide">
              Procurement Nature Distribution
            </h4>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Distribution of requirements mapped out by category of purchase to reveal the highest-volume developer sectors.
          </p>
        </div>
        
        {/* Toggle Controls */}
        <div className="flex items-center self-start sm:self-center bg-[#F1F5F9] p-0.5 rounded-lg text-[10px] uppercase font-mono font-bold text-slate-500">
          <button 
            type="button"
            onClick={() => setFilterActive(true)}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all duration-150 ${filterActive ? 'bg-white text-indigo-700 shadow-xs font-black' : 'hover:text-slate-900'}`}
          >
            Active Tenders ({tenders.filter(isActiveTender).length})
          </button>
          <button 
            type="button"
            onClick={() => setFilterActive(false)}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all duration-150 ${!filterActive ? 'bg-white text-indigo-700 shadow-xs font-black' : 'hover:text-slate-900'}`}
          >
            All Tenders ({tenders.length})
          </button>
        </div>
      </div>

      {/* Main visualization grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Dynamic and styled Recharts Chart (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between" style={{ minHeight: '300px' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Tender Count Comparison
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
              {chartData.summary.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData.summary} 
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#CBD5E1] p-3 rounded-lg shadow-md space-y-1.5 text-xs text-left">
                          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                            <span className="font-bold text-[#1E293B]">{data.name} Division</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Tender Count: </span>
                            <span className="font-extrabold text-[#1E293B]">{data.count}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Distribution: </span>
                            <span className="font-extrabold text-[#1E293B]">{data.percentage}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Est. Budget: </span>
                            <span className="font-extrabold" style={{ color: data.color }}>{formatBDTShort(data.totalValue)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[6, 6, 0, 0]}
                >
                  {chartData.summary.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="transition-all duration-300 hover:opacity-85"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-center">
            <span className="text-[10px] text-slate-400 font-mono italic">
              * Bars represent live notices scraped and parsed directly from e-GP.
            </span>
          </div>
        </div>

        {/* Right Side: Sector Insight & Details Card (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          {/* Top insight alert box banner */}
          <div className="bg-indigo-50/50 border border-indigo-100/40 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-700 font-bold uppercase tracking-wider text-[11px]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Socio-Economic Sector Insight</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Based on the {filterActive ? 'active' : 'total'} dataset of <strong className="text-[#1E293B] font-bold">{chartData.totalCount} tenders</strong>, the demand is heavily led by <strong className="text-indigo-700 font-bold">{topSector.name}</strong>, capturing <strong className="text-[#1E293B] font-bold">{topSector.percentage}%</strong> of live procurements.
            </p>
            <div className="pt-1.5 flex items-center justify-between">
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded-full">
                High-Volume Sector: {topSector.name}
              </span>
            </div>
          </div>

          {/* Breakdown cards for Goods, Works, and Services */}
          <div className="space-y-2.5">
            {chartData.summary.map(item => (
              <div 
                key={item.name} 
                className="group border border-[#F1F5F9] hover:border-slate-200 transition-all duration-150 rounded-xl p-3 flex items-start gap-3 bg-white"
              >
                <div 
                  className="rounded-lg p-2 shrink-0 transition-transform duration-150 group-hover:scale-105"
                  style={{ backgroundColor: item.bgLight, color: item.color }}
                >
                  {item.name === 'Goods' ? (
                    <Package className="w-4 h-4" />
                  ) : item.name === 'Works' ? (
                    <Briefcase className="w-4 h-4" />
                  ) : (
                    <Layers className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 space-y-1 min_width_0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1E293B] text-xs uppercase flex items-center gap-1.5">
                      {item.name}
                      <span className="text-[10px] text-slate-400 font-normal lowercase font-mono">
                        ({item.count} items)
                      </span>
                    </span>
                    <span 
                      className="text-xs font-mono font-extrabold"
                      style={{ color: item.color }}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                  
                  <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-1 group-hover:line-clamp-none transition-all duration-200">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400 pt-1">
                    <span>Est. Sector Budget CAP:</span>
                    <span className="text-slate-700">{formatBDTShort(item.totalValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
