'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Load react-d3-tree only on the client (it touches window/document)
const Tree = dynamic(() => import('react-d3-tree').then(m => m.Tree), { ssr: false });

export default function TreeDemo() {
  const [data, setData] = useState(null);

  // Center the tree a bit
  const [translate, setTranslate] = useState<{x:number;y:number}>({ x: 200, y: 200 });

  // If your container width is known you can compute this; here we just set something reasonable.
  useEffect(() => setTranslate({ x: 300, y: 100 }), []);

  useEffect(() => {
    fetch('/treeData.json')
      .then(response => response.json())
      .then(setData)
      .catch(error => console.error('Error loading tree data:', error));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ width: '100%', height: 600, border: '1px solid #ddd' }}>
      <Tree
        data={data}
        translate={translate}
        orientation="horizontal"   // try "vertical" too
        collapsible
        zoom={0.8}
      />
    </div>
  );
}
