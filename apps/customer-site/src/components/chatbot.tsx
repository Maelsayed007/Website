'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { chat } from '@/ai/flows/chatbot-flow';

type Message = {
  text: string;
  sender: 'user' | 'bot';
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm the Amieira Getaways assistant. How can I help you today?",
      sender: 'bot',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (isOpen) {
        setTimeout(scrollToBottom, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = { text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chat({ message: inputValue });
      const botMessage: Message = { text: response.response, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Chatbot error:', error);
      const errorMessageText = error.message || "Sorry, I'm having trouble connecting. Please try again later.";
      const errorMessage: Message = {
        text: `Error: ${errorMessageText}`,
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-full w-16 h-16 shadow-lg bg-primary hover:bg-primary/90"
            aria-label="Toggle chatbot"
          >
            {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-50"
          >
            <Card className="w-[350px] h-[500px] flex flex-col shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground p-4">
                <h3 className="font-semibold text-lg">Amieira Assistant</h3>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-end gap-2',
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.sender === 'bot' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot size={20} />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          'p-3 rounded-2xl max-w-[80%]',
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted rounded-bl-none'
                        )}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot size={20} />
                            </AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-2xl max-w-[80%] bg-muted rounded-bl-none">
                            <div className="flex gap-1.5 items-center">
                                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-0"></span>
                                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-150"></span>
                                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-300"></span>
                            </div>
                        </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t">
                <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 rounded-full focus-visible:ring-offset-0 focus-visible:ring-1"
                    autoComplete="off"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" className="rounded-full" disabled={isLoading}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
