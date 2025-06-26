function ChatContainer({ messages, isLoading }) {
    try {
        const messagesEndRef = React.useRef(null);

        const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        };

        React.useEffect(() => {
            scrollToBottom();
        }, [messages, isLoading]);

        React.useEffect(() => {
            lucide.createIcons();
        }, [messages, isLoading]);

        return (
            <div data-name="chat-container" data-file="components/ChatContainer.js" 
                 className="flex-1 overflow-y-auto chat-scroll bg-black">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-24">
                            <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mb-6 shadow-sm professional-border">
                                <i data-lucide="cpu" className="w-8 h-8 text-gray-300"></i>
                            </div>
                            <h2 className="text-2xl font-semibold text-white mb-3">
                                Welcome to Chitti
                            </h2>
                            <p className="text-gray-400 text-base max-w-md leading-relaxed">
                                Professional AI assistant ready to help with your tasks and questions
                            </p>
                        </div>
                    ) : (
                        <div>
                            {messages.map((msg, index) => (
                                <MessageBubble
                                    key={index}
                                    message={msg.content}
                                    isUser={msg.role === 'user'}
                                />
                            ))}
                            {isLoading && <LoadingMessage />}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        );
    } catch (error) {
        console.error('ChatContainer component error:', error);
        reportError(error);
    }
}
