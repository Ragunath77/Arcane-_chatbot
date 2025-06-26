function LoadingMessage() {
    try {
        return (
            <div data-name="loading-message" data-file="components/LoadingMessage.js" 
                 className="flex w-full mb-6 justify-start">
                <div className="flex max-w-3xl">
                    <div className="flex-shrink-0 mr-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shadow-sm">
                            <i data-lucide="cpu" className="w-4 h-4 text-white"></i>
                        </div>
                    </div>
                    <div className="px-4 py-3 bg-gray-800 rounded-xl rounded-bl-md shadow-sm professional-border">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" 
                                 style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" 
                                 style={{animationDelay: '0.4s'}}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('LoadingMessage component error:', error);
        reportError(error);
    }
}
