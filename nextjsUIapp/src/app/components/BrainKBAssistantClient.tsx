// // components/BrainKBAssistantWrapper.tsx
// 'use client';
//
// import dynamic from 'next/dynamic';
//
// const BrainKBAssistant = dynamic(() => import('brainkb-assistant'), { ssr: false })
//
// const config = {
//   branding: {
//     title: 'BrainKB Assistant',
//     subtitle: 'Knowledge Helper',
//     primaryColor: 'from-purple-600 to-blue-600'
//   },
//   api: {
//     endpoint: 'https://api.example.com/chat',
//     type: 'rest' as const,
//     headers: {
//       'Authorization': 'Bearer your-token'
//     }
//   },
//   features: {
//     enableQuickActions: true,
//     enableFileUpload: true,
//     enableContextDetection: true, // ✅ Context detection
//     enableMessageEditing: true,   // ✅ Message editing
//     enableCodeRendering: true,    // ✅ Code rendering
//     enableMarkdown: true,         // ✅ Markdown support
//     enableTypingIndicator: true,  // ✅ Typing indicators
//     enableExpandableWindow: true, // ✅ Expandable window
//     enableDragAndDrop: true,      // ✅ Drag and drop
//     enableKeyboardShortcuts: true // ✅ Keyboard shortcuts
//   },
//   // ✅ Custom Quick Actions
//   quickActions: [
//     {
//       id: 'find_connections',
//       label: '🔗 Find Connections',
//       icon: '🔗',
//       action: 'find_connections',
//       description: 'Find connections between entities'
//     },
//     {
//       id: 'explore_entities',
//       label: '📊 Explore Entities',
//       icon: '📊',
//       action: 'explore_entities',
//       description: 'Explore entity data and relationships'
//     }
//   ],
//   ui: {
//     position: 'bottom-right' as const,
//     defaultOpen: true,
//     zIndex: 999999, // Much higher z-index
//     size: {
//       width: '600px',
//       height: '700px',
//       expandedWidth: '1200px',
//       expandedHeight: '900px'
//     },
//     styling: {
//       forcePosition: true, // ✅ Always at bottom-right
//       buttonColor: 'from-blue-600 to-purple-600',
//       chatBackground: 'bg-white',
//       textColor: 'text-gray-800',
//       borderColor: 'border-gray-200',
//       shadowColor: 'shadow-xl'
//     }
//   },
//   // ✅ Callbacks for debugging
//   callbacks: {
//     onMessageSend: (message: string) => {
//       console.log('📤 Message sent:', message);
//     },
//     onResponseReceived: (response: any) => {
//       console.log('📥 Response received:', response);
//     },
//     onError: (error: any) => {
//       console.error('❌ Error:', error);
//     },
//     onFileUpload: (file: File) => {
//       console.log('📁 File uploaded:', file.name, file.size);
//     },
//     onQuickAction: (action: string) => {
//       console.log('⚡ Quick action triggered:', action);
//     }
//   }
// };
//
// // // ✅ Debug page context
// // const pageContext = {
// //   title: 'Knowledge Graph Dashboard',
// //   description: 'Explore and analyze knowledge graph data',
// //   keywords: ['knowledge', 'graph', 'entities', 'relationships'],
// //   entities: ['Person', 'Organization', 'Location']
// // };
// //
// // console.log('🔍 Page Context:', pageContext);
// // console.log('⚙️ Config:', config);
// // const config = {
// //   branding: {
// //     title: 'BrainKB Assistant',
// //     subtitle: 'Knowledge Helper',
// //     primaryColor: 'from-purple-600 to-blue-600'
// //   },
// //   api: {
// //     endpoint: 'https://api.example.com/chat',
// //     type: 'rest' as const,
// //     headers: {
// //       'Authorization': 'Bearer your-token'
// //     }
// //   },
// //   features: {
// //     enableQuickActions: true,
// //     enableFileUpload: true,
// //     enableContextDetection: true,
// //     enableMarkdown: true
// //   },
// //   ui: {
// //     position: 'bottom-right' as const,
// //      defaultOpen: true,
// //     size: {
// //       width: '600px',
// //       height: '700px'
// //     }
// //   }
// // }
//
// export default function BrainKBAssistantWrapper() {
//   return <BrainKBAssistant config={config} />
// }

'use client';

import dynamic from 'next/dynamic';

const BrainKBAssistant = dynamic(() => import('brainkb-assistant'), { ssr: false })

const config = {
  branding: {
    title: 'BrainKB Assistant',
    subtitle: 'Knowledge Helper',
    primaryColor: 'from-purple-600 to-blue-600'
  },
  api: {
    endpoint: 'http://127.0.0.1:8000/api/chat?stream=false',
    type: 'rest' as const,
    headers: { 
      'Content-Type': 'application/json',
    }
  },
  features: {
    enableQuickActions: true,
    enableFileUpload: true,
    enableContextDetection: true, // ✅ Context detection
    enableMessageEditing: true,   // ✅ Message editing
    enableCodeRendering: true,    // ✅ Code rendering
    enableMarkdown: true,         // ✅ Markdown support
    enableTypingIndicator: true,  // ✅ Typing indicators
    enableExpandableWindow: true, // ✅ Expandable window
    enableDragAndDrop: true,      // ✅ Drag and drop
    enableKeyboardShortcuts: true // ✅ Keyboard shortcuts
  },
  // ✅ Custom Quick Actions
  quickActions: [
    {
      id: 'find_connection',
      label: 'Find Connections',
      icon: '🔗',
      action: 'find_connections',
      description: 'Find connections between entities'
    },
    {
      id: 'explore_entities',
      label: 'Explore Concepts',
      icon: '📊',
      action: 'explore_entities',
      description: 'Explore entity data and relationships'
    },
    {
      id: 'search_knowledge',
      label: 'Search Knowledge',
      icon: '🔍',
      action: 'search_knowledge',
      description: 'Search through knowledge base'
    },
    {
      id: 'rapid_release_data',
      label: 'Rapid Release Data',
      icon: '📈',
      action: 'Get 1000 rapid release data',
      description: 'Get 1000 rapid release data.'
    },
    {
      id: 'explain_concepts',
      label: '💡 Explain Concepts',
      icon: '💡',
      action: 'explain_concepts',
      description: 'Get detailed explanations'
    },
    {
      id: 'show_evidence',
      label: 'Show Evidence',
      icon: '📋',
      action: 'show_evidence',
      description: 'View supporting evidence'
    }
  ],
  ui: {
    position: 'bottom-right' as const,
    defaultOpen: true,
    zIndex: 999999, // Much higher z-index
    size: {
      width: '600px',
      height: '700px',
      expandedWidth: '1200px',
      expandedHeight: '900px'
    },
    styling: {
      forcePosition: true, // ✅ Always at bottom-right
      buttonColor: 'from-blue-600 to-purple-600',
      chatBackground: 'bg-white',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200',
      shadowColor: 'shadow-xl'
    }
  },
  customization: {
    welcomeMessage: 'Hello and welcome to BrainKB Assistant! 👋 I can help you explore knowledge graphs and answer your questions.',
    placeholderText: 'Ask about Knowledge Graph or anything',
    errorMessage: 'Sorry, I encountered an error. Please try again.',
    loadingMessage: 'Thinking...'
  },
  // ✅ Callbacks for debugging
  callbacks: {
    onMessageSend: (message: string) => {
      console.log('📤 Message sent:', message);
    },
    onResponseReceived: (response: any) => {
      console.log('📥 Response received:', response);
    },
    onError: (error: any) => {
      console.error('❌ Error:', error);
    },
    onFileUpload: (file: File) => {
      console.log('📁 File uploaded:', file.name, file.size);
    },
    onQuickAction: (action: string) => {
      console.log('⚡ Quick action triggered:', action);
    }
  }
};

// ✅ Debug page context
const pageContext = {
  title: 'Knowledge Graph Dashboard',
  description: 'Explore and analyze knowledge graph data',
  keywords: ['knowledge', 'graph', 'entities', 'relationships'],
  entities: ['Person', 'Organization', 'Location']
};

console.log('🔍 Page Context:', pageContext);
console.log('⚙️ Config:', config);

export default function BrainKBAssistantWrapper() {
  return <BrainKBAssistant config={config} pageContext={pageContext} />
}