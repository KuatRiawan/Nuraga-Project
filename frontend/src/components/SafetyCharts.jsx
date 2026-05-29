import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const SafetyCharts = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/stats/monthly');
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="h-64 flex items-center justify-center text-slate-400">Loading charts...</div>;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm transition-colors duration-300">
            <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Safety Trend Analysis</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest mt-1">Last 30 Days Activity</p>
            </div>

            <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 30, bottom: 25 }}>
                        <XAxis
                            dataKey="date"
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={{ stroke: '#cbd5e1' }}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            minTickGap={30}
                            tickFormatter={(str) => {
                                const date = new Date(str);
                                return date.toLocaleDateString('default', { day: 'numeric', month: 'short' });
                            }}
                            label={{ value: 'Tanggal (30 Hari Terakhir)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#64748b', fontWeight: 'bold' } }}
                        />
                        <YAxis 
                            axisLine={{ stroke: '#cbd5e1' }} 
                            tickLine={{ stroke: '#cbd5e1' }} 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            label={{ value: 'Jumlah Kasus', angle: -90, position: 'insideLeft', offset: -15, style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b', fontWeight: 'bold' } }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0f172a',
                                border: 'none',
                                borderRadius: '1rem',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend 
                            iconType="rect" 
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">{value}</span>}
                        />
                        <Line
                            type="linear"
                            dataKey="hazards"
                            name="Hazards Reported"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            dot={{ r: 5, stroke: '#f59e0b', strokeWidth: 1.5, fill: '#f59e0b', fillOpacity: 0.8 }}
                            activeDot={{ r: 7 }}
                        />
                        <Line
                            type="linear"
                            dataKey="incidents"
                            name="Incidents Logged"
                            stroke="#ef4444"
                            strokeWidth={1.5}
                            dot={{ r: 5, stroke: '#ef4444', strokeWidth: 1.5, fill: '#ef4444', fillOpacity: 0.8 }}
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SafetyCharts;
