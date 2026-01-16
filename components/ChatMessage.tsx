import React from 'react';
import { ChatMessage as ChatMessageType, MessageRole } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  
  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center mb-2 space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black border-2 relative transition-all duration-300 ${
            isUser 
              ? 'bg-indigo-600 border-indigo-400/50 text-white shadow-lg shadow-indigo-900/20' 
              : 'bg-gradient-to-br from-green-700 via-emerald-800 to-indigo-900 border-green-500/40 text-white shadow-xl shadow-green-950/40'
          }`}>
            {isUser ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <span className="text-xs">BL</span>
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center border-2 border-green-800 shadow-sm">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
            {isUser ? 'USER COMMAND' : 'BOADI PERSCO AI'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className={`px-6 py-5 rounded-[1.5rem] shadow-2xl transition-all duration-300 border backdrop-blur-sm ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-400/20 shadow-indigo-900/10' 
            : message.type === 'error' 
              ? 'bg-red-900/30 border-red-800/50 text-red-200 rounded-tl-none'
              : 'glass-card text-slate-100 rounded-tl-none border-white/5'
        }`}>
          {message.type === 'image' && message.imageUrl ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl group">
                <img src={message.imageUrl} alt="Visual Feed" className="w-full max-w-lg object-cover shadow-2xl transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-60"></div>
              </div>
              {message.content && (
                <p className="text-sm font-medium tracking-tight text-slate-300 leading-relaxed italic border-l-4 border-green-500 pl-4 bg-white/5 py-2 rounded-r-xl">
                  {message.content}
                </p>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[15.5px] leading-relaxed break-words font-medium text-slate-100 selection:bg-green-500/30">
              {message.content}
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-1 bg-green-500/20 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-green-400 font-black">Verified Grounding References</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {message.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex flex-col p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-green-500/30 transition-all duration-300"
                  >
                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-green-400 line-clamp-1 mb-1">
                      {source.title}
                    </span>
                    <span className="text-[9px] text-slate-500 group-hover:text-slate-400 truncate font-mono">
                      {source.uri}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;