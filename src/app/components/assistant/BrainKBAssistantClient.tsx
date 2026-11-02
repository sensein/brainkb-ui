'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { clientEnv } from '../../../config/env';

// Dynamic import to avoid SSR issues with loading indicator
const BrainKBAssistant = dynamic(() => import('brainkb-assistant'), { 
  ssr: false,
  loading: () => (
    <div className="fixed bottom-4 right-4 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
  )
})

const config = {
  branding: {
    title: 'BrainKB Assistant',
    subtitle: 'Knowledge Helper',
    primaryColor: 'from-purple-600 to-blue-600'
  },
  api: {
    endpoint: clientEnv.chatServiceEndpoint,
    type: 'rest' as const,
    streaming: false, // Set to true if your API supports streaming
    timeout: 30000,
    retryAttempts: 3,
    
    // Enhanced JWT Authentication Configuration
    auth: {
      enabled: true,
      type: 'jwt' as const,
      jwtEndpoint: clientEnv.tokenEndpoint,
      autoRefresh: true,
      refreshThreshold: 300, // Refresh 5 minutes before expiry
    },
    
    // Enhanced headers with version tracking
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.70',
      'X-Platform': 'nextjs',
      'X-Component': 'BrainKBAssistantClient',
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
    // {
    //   id: 'find_connection',
    //   label: 'Find Connections',
    //   icon: '🔗',
    //   action: 'find_connections',
    //   description: 'Find connections between entities'
    // },
    {
      id: 'explore_entities',
      label: 'Explore Concepts',
      icon: '📊',
      action: 'Explore distinct entities',
      description: 'Explore distinct entities'
    },
    // {
    //   id: 'search_knowledge',
    //   label: 'Search Knowledge',
    //   icon: '🔍',
    //   action: 'search_knowledge',
    //   description: 'Search through knowledge base'
    // },
    {
      id: 'rapid_release_data',
      label: 'Rapid Release Data',
      icon: '📈',
      action: 'Get insights on rapid release data',
      description: 'Get 1000 rapid release data.'
    },
    // {
    //   id: 'explain_concepts',
    //   label: '💡 Explain Concepts',
    //   icon: '💡',
    //   action: 'explain_concepts',
    //   description: 'Get detailed explanations'
    // },
    // {
    //   id: 'show_evidence',
    //   label: 'Show Evidence',
    //   icon: '📋',
    //   action: 'show_evidence',
    //   description: 'View supporting evidence'
    // }
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
  // Enhanced callbacks with JWT debugging
  callbacks: {
    onMessageSend: (message: string) => {
      console.log('📤 Message sent:', message);
    },
    onResponseReceived: (response: any) => {
      console.log('📥 Response received:', response);
    },
    onError: (error: any) => {
      console.error('❌ Error:', error);
      // Enhanced JWT error detection
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.error('🔐 Authentication error detected - check JWT credentials');
      }
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        console.error('🚫 Authorization error - check user permissions');
      }
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

// Enhanced debug logging with JWT info
console.log('🔍 Page Context:', pageContext);
console.log('⚙️ Config:', config);
console.log('🔐 JWT Endpoint:', process.env.NEXT_PUBLIC_TOKEN_ENDPOINT);
console.log('🌐 Chat Endpoint:', process.env.NEXT_PUBLIC_CHAT_ENDPOINT || process.env.CHAT_SERVICE_API_ENDPOINT);

export default function BrainKBAssistantWrapper() {
  return <BrainKBAssistant config={config} pageContext={pageContext} />
}