import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface TourCommandRequest {
  command_text: string;
  session_id: string;
  user_role?: string;
}

interface AIResponse {
  success: boolean;
  code: number;
  data?: {
    response: string;
    message_type: string;
    confidence: number;
    original_message: string;
    session_id: string;
    user_role?: string;
    reasoning?: {
      thought?: string | null;
      action?: string | null;
      observation?: string | null;
      final_answer?: string | null;
    };
    suggestions?: string[];
  };
  message?: string;
  error?: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  role: 'user' | 'assistant';
  timestamp: any;
}

// GET - Retrieve chat history for a user
// POST - Send voice command to AI backend
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse | { success: boolean; code: number; data: ChatMessage[]; error?: string; warning?: string }>
) {
  // GET - Retrieve chat history
  if (req.method === 'GET') {
    try {
      const { user_id } = req.query;

      if (!user_id || typeof user_id !== 'string') {
        return res.status(400).json({
          success: false,
          code: 400,
          data: [],
          error: 'user_id query parameter is required',
        });
      }

      // Query Firestore for chat history
      const messagesQuery = query(
        collection(db, 'ai_assistant_chats'),
        where('user_id', '==', user_id),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(messagesQuery);
      const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ChatMessage));

      return res.status(200).json({
        success: true,
        code: 200,
        data: messages,
      });
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      
      // If it's a Firestore index error, return empty array with warning
      if (error.code === 'failed-precondition') {
        console.warn('Firestore index missing. Create it at: https://console.firebase.google.com/v1/r/project/agry-7028f/firestore/indexes');
        return res.status(200).json({
          success: true,
          code: 200,
          data: [],
          warning: 'Chat history unavailable - Firestore index required',
        });
      }
      
      return res.status(500).json({
        success: false,
        code: 500,
        data: [],
        error: error.message || 'Failed to fetch chat history',
      });
    }
  }

  // POST - Send command to backend AI
  if (req.method === 'POST') {
    try {
      const { command_text, session_id, user_role = 'tourist' }: TourCommandRequest = req.body;

      // Validation
      if (!command_text || typeof command_text !== 'string' || command_text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: 'command_text is required and must be a non-empty string',
        });
      }

      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({
          success: false,
          code: 400,
          error: 'session_id is required',
        });
      }

      // Get backend URL from environment or use default
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

      // Call Flask backend
      const backendResponse = await fetch(`${backendUrl}/api/bot/tour-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command_text,
          session_id,
          user_role,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend returned ${backendResponse.status}`);
      }

      const aiResponse = await backendResponse.json();

      // Save user message to Firestore
      await addDoc(collection(db, 'ai_assistant_chats'), {
        session_id,
        user_id: session_id, // Using session_id as user_id for simplicity
        message: command_text,
        role: 'user',
        timestamp: serverTimestamp(),
      });

      // Save AI response to Firestore
      const aiMessage = aiResponse.data?.response || 'No response';
      await addDoc(collection(db, 'ai_assistant_chats'), {
        session_id,
        user_id: session_id,
        message: aiMessage,
        role: 'assistant',
        timestamp: serverTimestamp(),
      });

      return res.status(200).json({
        success: true,
        code: 200,
        data: aiResponse.data,
        message: 'Tour command processed successfully',
      });
    } catch (error: any) {
      console.error('Error processing tour command:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        error: error.message || 'Failed to process tour command',
      });
    }
  }

  return res.status(405).json({
    success: false,
    code: 405,
    error: 'Method not allowed. Only GET and POST are supported.',
  });
}

