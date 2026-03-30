import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Hash, Clock, ChevronRight, Save, LayoutGrid, List } from 'lucide-react';
import { cn, parseFrontmatter } from '@/src/lib/utils';
import * as d3 from 'd3';

interface StudioProps {
  onNewCapture: () => void;
}

export const Studio: React.FC<StudioProps> = ({ onNewCapture }) => {
  const [dreams, setDreams] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'intensity'>('date');
  const [filterDate, setFilterDate] = useState<string>('all');

  useEffect(() => {
    fetchDreams();
  }, []);

  const fetchDreams = async () => {
    const res = await fetch('/api/dreams');
    const data = await res.json();
    setDreams(data);
  };

  const handleSelect = (id: string, content: string) => {
    setSelectedId(id);
    setEditContent(content);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    await fetch(`/api/dreams/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent })
    });
    await fetchDreams();
    setIsSaving(false);
  };

  const selectedDream = dreams.find(d => d.id === selectedId);
  const metadata = selectedDream ? parseFrontmatter(selectedDream.content) : {};

  const backlinks = dreams.filter(d => 
    d.id !== selectedId && d.content.includes(`[[${selectedId}]]`)
  );

  const uniqueDates = Array.from(new Set(dreams.map(d => parseFrontmatter(d.content).date))).filter(Boolean).sort().reverse();

  const filteredDreams = dreams
    .filter(dream => {
      const meta = parseFrontmatter(dream.content);
      const matchesSearch = (meta.anchor || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = filterDate === 'all' || meta.date === filterDate;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      const metaA = parseFrontmatter(a.content);
      const metaB = parseFrontmatter(b.content);
      if (sortBy === 'date') {
        return new Date(metaB.date).getTime() - new Date(metaA.date).getTime();
      } else {
        return (metaB.intensity_peak || 0) - (metaA.intensity_peak || 0);
      }
    });

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xs uppercase tracking-[0.4em] font-mono text-white/40">The Studio</h1>
          <button 
            onClick={onNewCapture}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="px-6 mb-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <select 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="all">All Dates</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="date">Sort: Date</option>
              <option value="intensity">Sort: Intensity</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <input 
              type="text" 
              placeholder="Search chaos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-10">
          {filteredDreams.map(dream => {
            const meta = parseFrontmatter(dream.content);
            const isSelected = dream.id === selectedId;
            return (
              <button
                key={dream.id}
                onClick={() => handleSelect(dream.id, dream.content)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all group",
                  isSelected ? "bg-white/10 border border-white/20" : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{meta.date}</span>
                  <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/40" 
                      style={{ width: `${(meta.intensity_peak || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <h3 className="text-sm font-serif italic group-hover:translate-x-1 transition-transform">
                  {meta.anchor || "Untitled Dream"}
                </h3>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor/Viewer */}
      <div className="flex-1 flex flex-col">
        {selectedId ? (
          <>
            <div className="p-6 border-bottom border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">ID: {selectedId.slice(0, 8)}</span>
                <div className="h-4 w-[1px] bg-white/10" />
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} /> {metadata.date}
                </span>
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-white/90 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {isSaving ? "Saving..." : "Commit Changes"}
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Markdown Editor */}
              <div className="flex-1 p-10 overflow-y-auto border-r border-white/5">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full bg-transparent resize-none focus:outline-none font-mono text-sm leading-relaxed text-white/80"
                  spellCheck={false}
                />
              </div>

              {/* Preview & Data Viz */}
              <div className="w-[450px] p-10 overflow-y-auto bg-white/[0.02]">
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="mb-10">
                    <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 mb-6">Signal Visualization</h4>
                    <IntensityGraph dreamId={selectedId} />
                  </div>
                  
                  <div className="markdown-body">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => {
                          if (href?.startsWith('dream://')) {
                            const id = href.replace('dream://', '');
                            const targetDream = dreams.find(d => d.id === id);
                            return (
                              <button 
                                onClick={() => targetDream && handleSelect(targetDream.id, targetDream.content)}
                                className="text-white underline decoration-white/30 hover:decoration-white transition-colors italic font-serif"
                              >
                                {targetDream ? (parseFrontmatter(targetDream.content).anchor || id) : id}
                              </button>
                            );
                          }
                          return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                        }
                      }}
                    >
                      {editContent.replace(/\[\[(.*?)\]\]/g, '[$1](dream://$1)')}
                    </ReactMarkdown>
                  </div>

                  {backlinks.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-white/10">
                      <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 mb-6">Backlinks</h4>
                      <div className="space-y-3">
                        {backlinks.map(link => {
                          const meta = parseFrontmatter(link.content);
                          return (
                            <button
                              key={link.id}
                              onClick={() => handleSelect(link.id, link.content)}
                              className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                            >
                              <div className="text-[8px] font-mono text-white/20 uppercase mb-1">{meta.date}</div>
                              <div className="text-xs font-serif italic group-hover:translate-x-1 transition-transform">
                                {meta.anchor || link.id}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/10 gap-6">
            <LayoutGrid size={80} strokeWidth={0.5} />
            <p className="text-xs uppercase tracking-[0.5em] font-mono">Select a signal to reflect</p>
          </div>
        )}
      </div>
    </div>
  );
};

const IntensityGraph: React.FC<{ dreamId: string }> = ({ dreamId }) => {
  const [data, setData] = useState<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch(`/api/dreams/raw/${dreamId}`)
      .then(res => res.json())
      .then(setData);
  }, [dreamId]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const series = data.signal.intensity_series;
    const width = 350;
    const height = 120;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3.scaleLinear()
      .domain([0, series.length - 1])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top]);

    const line = d3.line<number>()
      .x((d, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveBasis);

    // Area
    const area = d3.area<number>()
      .x((d, i) => x(i))
      .y0(height - margin.bottom)
      .y1(d => y(d))
      .curve(d3.curveBasis);

    const gradientId = `grad-${dreamId}`;
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%").attr("y1", "100%")
      .attr("x2", "0%").attr("y2", "0%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", data.signal.emotion_hex)
      .attr("stop-opacity", 0);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", data.signal.emotion_hex)
      .attr("stop-opacity", 0.3);

    svg.append("path")
      .datum(series)
      .attr("fill", `url(#${gradientId})`)
      .attr("d", area);

    svg.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", data.signal.emotion_hex)
      .attr("stroke-width", 2)
      .attr("d", line);

  }, [data, dreamId]);

  if (!data) return <div className="h-[120px] w-full bg-white/5 animate-pulse rounded-lg" />;

  return (
    <div className="relative">
      <svg ref={svgRef} width="350" height="120" className="overflow-visible" />
      <div className="flex justify-between mt-2 text-[8px] font-mono text-white/20 uppercase tracking-widest">
        <span>Start</span>
        <span>{data.signal.duration_ms}ms</span>
        <span>End</span>
      </div>
    </div>
  );
};
