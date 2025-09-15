'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const Tree = dynamic(() => import('react-d3-tree').then(m => m.Tree), { ssr: false });

export default function TreeDemo() {
  const [data, setData] = useState<any>(null);
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 200, y: 200 });

  useEffect(() => setTranslate({ x: 300, y: 100 }), []);

  useEffect(() => {
    fetch('/treeData.json')
      .then(response => response.json())
      .then(setData)
      .catch(error => console.error('Error loading tree data:', error));
  }, []);

  if (!data) return <div>Loading...</div>;

  // Custom node renderer
  const renderCustomNode = ({ nodeDatum, toggleNode }: any) => (
    <g onClick={toggleNode} cursor="pointer">
      <circle r={15} fill={nodeDatum.nodeColor || 'lightgray'} />
      {/* Make text ignore pointer events so the <g> receives the click */}
      <text x={20} dy={5} style={{ pointerEvents: 'none' }}>
        {nodeDatum.name}
      </text>
    </g>
  );

  return (
    <div style={{ width: '100%', height: 600, border: '1px solid #ddd' }}>
      <Tree
        data={data}
        translate={translate}
        orientation="horizontal"
        collapsible
        zoom={0.8}
        renderCustomNodeElement={renderCustomNode} 
      />
    </div>
  );
}


