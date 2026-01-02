import React, { useState, useRef, useEffect } from 'react';
import SideNav from '../../components/SideNav';
import TopNav from '../../components/TopNav';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useRouter } from 'next/router';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date | any;
}

export default function TouristAIAssistant() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Get userId from localStorage
    const storedUserId = localStorage.getItem('userUid');
    if (storedUserId) {
      setUserId(storedUserId);
      loadChatHistory(storedUserId);
    } else {
      // Redirect to login if no userId
      router.push('/');
    }

    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsRecording(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }

      // Initialize Speech Synthesis
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [router]);

  const loadChatHistory = async (uid: string) => {
    try {
      setIsLoading(true);
      const chatsRef = collection(db, 'aiChats');
      
      // Try with composite query first
      try {
        const q = query(
          chatsRef,
          where('userId', '==', uid),
          where('userRole', '==', 'tourist'),
          orderBy('timestamp', 'asc')
        );
        
        const snapshot = await getDocs(q);
        const loadedMessages: Message[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({
            id: doc.id,
            type: data.type,
            content: data.content,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        });

        if (loadedMessages.length === 0) {
          // Add welcome message
          const welcomeMsg: Message = {
            id: '1',
            type: 'ai',
            content: "Hello! I'm your AI tour assistant. How can I help you today? You can ask me about creating tour requests, finding guides, managing bookings, or any travel advice you need!",
            timestamp: new Date()
          };
          setMessages([welcomeMsg]);
        } else {
          setMessages(loadedMessages);
        }
      } catch (indexError: any) {
        // If index error, fallback to simpler query
        if (indexError.code === 'failed-precondition') {
          console.warn('Composite index not created. Using fallback query.');
          const q = query(
            chatsRef,
            where('userId', '==', uid),
            where('userRole', '==', 'tourist')
          );
          
          const snapshot = await getDocs(q);
          const loadedMessages: Message[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            loadedMessages.push({
              id: doc.id,
              type: data.type,
              content: data.content,
              timestamp: data.timestamp?.toDate() || new Date(),
            });
          });

          // Sort manually since we can't use orderBy
          loadedMessages.sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
            return timeA - timeB;
          });

          if (loadedMessages.length === 0) {
            const welcomeMsg: Message = {
              id: '1',
              type: 'ai',
              content: "Hello! I'm your AI tour assistant. How can I help you today? You can ask me about creating tour requests, finding guides, managing bookings, or any travel advice you need!",
              timestamp: new Date()
            };
            setMessages([welcomeMsg]);
          } else {
            setMessages(loadedMessages);
          }
        } else {
          throw indexError;
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Show welcome message on error
      const welcomeMsg: Message = {
        id: '1',
        type: 'ai',
        content: "Hello! I'm your AI tour assistant. How can I help you today?",
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveChatMessage = async (message: Message) => {
    if (!userId) return;

    try {
      const chatsRef = collection(db, 'aiChats');
      await addDoc(chatsRef, {
        userId,
        userRole: 'tourist',
        type: message.type,
        content: message.content,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async (message?: string) => {
    const messageContent = message || inputMessage.trim();
    if (!messageContent || !userId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Save user message to Firestore
    await saveChatMessage(userMessage);

    try {
      // Send to backend smart router
      const response = await fetch('http://localhost:5000/api/smart-router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageContent,
          userid: userId,
          userRole: 'tourist'
        }),
      });

      const data = await response.json();
      console.log('data', data);
      
      let aiContent = '';
      let isIncomplete = false;
      
      const isSuccess = data.success || data.status === 'success';
      
      if (isSuccess) {
      
        if (
          (data.message === 'I need more information to create your tour request' ||
           data.data?.status === 'incomplete') &&
          data.data?.questions
        ) {
          isIncomplete = true;
          aiContent = data.data.questions;
        }
      
        else if (
          data.message?.toLowerCase().includes('created successfully') ||
          data.data?.status === 'complete'
        ) {
          aiContent =
            'Your tour request has been created successfully! 🎉\n\n' +
            'Please check the **My Tour Requests** page to view your request and see if any guides are applying.';
        }
      
        else {
          aiContent =
            data.data?.response ||
            data.data?.message ||
            data.data?.questions ||
            data.message ||
            'Request processed successfully.';
        }
      
      } else {
        aiContent = data.message || 'Something went wrong.';
      }
      

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

      await saveChatMessage(aiResponse);

      if (voiceEnabled) {
        speakText(aiContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error connecting to the server. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const quickReplies = [
    { text: 'Create tour request', action: () => handleSendMessage('I want to create a new tour request') },
    { text: 'My bookings', action: () => handleSendMessage('Show my bookings') },
    { text: 'Travel advice', action: () => handleSendMessage('Give me travel advice for my trip') }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav
        activeMenu="ai-assistant"
        userType="tourist"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto lg:ml-0">
        <TopNav
          title="AI Assistant"
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          showSearch={false}
        />

        <div className="flex flex-col h-full">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">AI Travel Assistant</h1>
                  <p className="text-sm text-gray-500">Your intelligent travel companion</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setVoiceEnabled(!voiceEnabled);
                      if (!voiceEnabled) {
                        stopSpeaking();
                      }
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}
                    title={voiceEnabled ? 'Voice enabled - Click to disable' : 'Voice disabled - Click to enable'}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {voiceEnabled ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      )}
                    </svg>
                  </button>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    voiceEnabled 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    🔊 {voiceEnabled ? 'Voice ON' : 'Voice OFF'}
                  </span>
                </div>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                    title="Stop speaking"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user'
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                    }`}>
                    {message.type === 'user' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${message.type === 'user'
                      ? 'bg-blue-100 text-black'
                      : 'bg-gray-100 text-black'
                    }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                      {message.timestamp instanceof Date 
                        ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-xs lg:max-w-md">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={reply.action}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  {reply.text}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`p-3 rounded-full transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice recording'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (!voiceEnabled) {
                    stopSpeaking();
                  }
                }}
                className={`p-3 rounded-full transition-all ${
                  voiceEnabled 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
                title={voiceEnabled ? 'Voice output ON - Click to turn OFF' : 'Voice output OFF - Click to turn ON'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {voiceEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  )}
                </svg>
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Listening..." : "Type your message or use voice..."}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                  disabled={isRecording}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isRecording}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2 text-center">
              {isRecording ? '🎤 Recording... Speak now' : `AI Assistant • ${voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'} • Text Mode`}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
