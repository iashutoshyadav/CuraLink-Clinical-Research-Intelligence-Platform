import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import ChatInput from '../components/chat/FollowUpBar.jsx';
import InputForm from '../components/chat/InputForm.jsx';
import useChatStore from '../store/useChatStore.js';

export default function Chat() {
  const messages   = useChatStore((s) => s.messages);
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen pt-24" style={{ background: '#ffffff' }}>
      <AnimatePresence mode="wait">
        {!hasMessages ? (
          <motion.div
            key="input-form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-20"
          >
            <ChatWindow />
            <InputForm />
          </motion.div>
        ) : (
          <motion.div
            key="chat-active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ChatWindow />
            <ChatInput />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
