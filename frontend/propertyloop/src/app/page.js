// pages/index.jsx
"use client";
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export default function ChatInterface() {
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize new session on mount
  useEffect(() => {
    const newSession = createNewSession();
    setChatSessions([newSession]);
    setCurrentSessionId(newSession.id);
    localStorage.removeItem('chatSessions'); // Wipe old sessions
  }, []);

  const createNewSession = () => ({
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    scrollToBottom();
  }, [chatSessions, currentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    const updatedSessions = [...chatSessions, newSession];
    
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
    setChatSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setIsLoading(true);
    const currentSession = chatSessions.find(s => s.id === currentSessionId);

    // Create user message
    const userMessage = {
      id: Date.now(),
      text: inputText,
      isUser: true,
      image: selectedImage,
    };

    // Update session with user message
    let updatedSessions = chatSessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages: [...session.messages, userMessage] }
        : session
    );

    // Update title if first message
    if (currentSession.messages.length === 0) {
      const newTitle = inputText.trim().substring(0, 20) || 'New Chat';
      updatedSessions = updatedSessions.map(session =>
        session.id === currentSessionId
          ? { ...session, title: newTitle }
          : session
      );
    }

    setChatSessions(updatedSessions);
    
    try {
      const formData = new FormData();
      formData.append('text', inputText);
      if (selectedImage) {
        const blob = await fetch(selectedImage).then(r => r.blob());
        formData.append('image', blob, 'image.png');
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      // Create assistant message
      const assistantMessage = {
        id: Date.now() + 1,
        text: data.response,
        isUser: false,
      };

      // Update session with assistant message
      updatedSessions = updatedSessions.map(session =>
        session.id === currentSessionId
          ? { ...session, messages: [...session.messages, assistantMessage] }
          : session
      );
    } catch {
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Error: Could not get response',
        isUser: false,
      };
      updatedSessions = updatedSessions.map(session =>
        session.id === currentSessionId
          ? { ...session, messages: [...session.messages, errorMessage] }
          : session
      );
    }

    setChatSessions(updatedSessions);
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
    setInputText('');
    setSelectedImage(null);
    setIsLoading(false);
  };

  const currentSession = chatSessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="flex flex-col justify-between h-screen w-64 bg-gray-800 p-4 border-r border-gray-700">
      <div>
        <button
          onClick={handleNewChat}
          className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
        >
          New Chat
        </button>
        <div className="space-y-2">
          {chatSessions
            .filter(session => session.id !== currentSessionId)
            .reverse()
            .map(session => (
              <div
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className="p-2 hover:bg-gray-700 rounded-lg cursor-pointer text-gray-300 truncate"
              >
                {session.title}
              </div>
            ))}
        </div>
      </div>
      <div className="text-center text-gray-400 mt-4">
        Made with ❤️ by <br />Shyam Sunder
        <div className="text-xs">f20190644g@alumni.bits-pilani.ac.in</div>
      </div>
    </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentSession?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-4 rounded-lg ${
                  message.isUser 
                    ? 'bg-blue-600 text-white ml-20'
                    : 'bg-gray-800 text-gray-100 mr-20'
                }`}
              >
                {message.image && (
                  <Image
                  src={message.image}
                  alt="Uploaded content"
                  width={300}
                  height={200}
                  className="mb-2 rounded-lg object-cover"
                />
                )}
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {message.text}
                </Markdown>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        
          <form 
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-700 bg-gray-900"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              const text = e.target.value;
              setInputText(text);
              
              setChatSessions(prevSessions =>
                prevSessions.map(session =>
                  session.id === currentSessionId
                    ? { ...session, title: text.trim().substring(0, 20) || 'New Chat' }
                    : session
                )
              );
            }}
            placeholder="Type your message..."
            className="flex-1 p-2 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <label className="cursor-pointer p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isLoading}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </div>
        {selectedImage && (
          <div className="mt-2 relative">
            <Image
              src={selectedImage}
              alt="Selected preview"
              width={96}
              height={96}
              className="h-24 w-24 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </form>
      </div>
    </div>
  );
}