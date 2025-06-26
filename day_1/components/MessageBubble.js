function MessageBubble({ message, isUser }) {
    try {
        return (
            <div data-name="message-bubble" data-file="components/MessageBubble.js" 
                 className={`flex w-full mb-6 message-slide ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                            isUser ? 'bg-blue-600' : 'bg-gray-700'
                        }`}>
                            <i data-lucide={isUser ? 'user' : 'cpu'} className="w-4 h-4 text-white"></i>
                        </div>
                    </div>
                    <div className={`px-4 py-3 rounded-xl shadow-sm professional-border ${
                        isUser 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : 'bg-gray-800 text-gray-100 rounded-bl-md'
                    }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">{message}</p>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('MessageBubble component error:', error);
        reportError(error);
    }
}
